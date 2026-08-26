import { hashKey, QueryClient, type QueryKey } from "@tanstack/query-core";

import type { DataCacheableResult, DataQueryCachePort, DataQueryRequest } from "./types.js";

interface CacheEntry {
  readonly expiresAt: number;
  readonly key: QueryKey;
  readonly tags: ReadonlySet<string>;
}

export class DataQueryCache implements DataQueryCachePort {
  private readonly entries = new Map<string, CacheEntry>();
  private readonly maxEntries: number;
  private readonly now: () => number;
  private readonly queryClient: QueryClient;

  constructor(maxEntries?: number, queryClient?: QueryClient, now?: () => number) {
    this.maxEntries = resolveCapacity(maxEntries);
    this.queryClient = resolveQueryClient(queryClient);
    this.now = resolveClock(now);
  }

  get size(): number {
    return this.entries.size;
  }

  clear(): void {
    this.queryClient.clear();
    this.entries.clear();
  }

  get(request: DataQueryRequest): DataCacheableResult | undefined {
    const key = dataQueryKey(request);
    const id = hashKey(key);
    const entry = this.entries.get(id);
    if (expired(entry, this.now())) {
      this.remove(id, entry);
      return undefined;
    }
    const result = this.queryClient.getQueryData<DataCacheableResult>(key);
    if (result === undefined) return undefined;
    this.touch(id);
    return result;
  }

  invalidateTags(tags: readonly string[]): number {
    const targets = new Set(tags);
    const matches = [...this.entries].filter(([, entry]) =>
      [...entry.tags].some((tag) => targets.has(tag))
    );
    if (matches.length === 0) return 0;
    const ids = new Set(matches.map(([id]) => id));
    this.queryClient.removeQueries({ predicate: ({ queryHash }) => ids.has(queryHash) });
    for (const [id] of matches) this.entries.delete(id);
    return matches.length;
  }

  set(request: DataQueryRequest, result: DataCacheableResult): void {
    const key = dataQueryKey(request);
    const id = hashKey(key);
    this.queryClient.setQueryData(key, result, { updatedAt: Date.parse(result.receivedAt) });
    this.entries.delete(id);
    this.entries.set(id, {
      expiresAt: this.now() + request.cache.retainForMs,
      key,
      tags: new Set(result.invalidationTags)
    });
    this.evictOverflow();
  }

  private evictOverflow(): void {
    while (this.entries.size > this.maxEntries) {
      const oldest = this.entries.entries().next().value as [string, CacheEntry] | undefined;
      if (oldest === undefined) return;
      this.remove(oldest[0], oldest[1]);
    }
  }

  private touch(id: string): void {
    const entry = this.entries.get(id);
    if (entry === undefined) return;
    this.entries.delete(id);
    this.entries.set(id, entry);
  }

  private remove(id: string, entry: CacheEntry): void {
    this.queryClient.removeQueries({ exact: true, queryKey: entry.key });
    this.entries.delete(id);
  }
}

export function dataQueryKey(request: DataQueryRequest): QueryKey {
  return [
    "unifold-data-v1",
    request.operationId,
    request.variables,
    valueOr(request.page, null),
    valueOr(request.sort, []),
    valueOr(request.filter, null)
  ];
}

function resolveCapacity(value: number | undefined): number {
  const capacity = valueOr(value, 1_000);
  if (validCapacity(capacity)) return capacity;
  throw new RangeError("Data query cache maxEntries must be an integer from 1 through 10,000.");
}

function validCapacity(value: number): boolean {
  return [Number.isInteger(value), value >= 1, value <= 10_000].every(Boolean);
}

function resolveQueryClient(value: QueryClient | undefined): QueryClient {
  return valueOr(value, new QueryClient());
}

function resolveClock(value: (() => number) | undefined): () => number {
  return valueOr(value, Date.now);
}

function valueOr<T>(value: T | undefined, fallback: T): T {
  return value === undefined ? fallback : value;
}

function expired(entry: CacheEntry | undefined, now: number): entry is CacheEntry {
  if (entry === undefined) return false;
  return entry.expiresAt <= now;
}
