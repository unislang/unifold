import type {
  UiAsyncStoreAdapter,
  UiAsyncStoreAdapterCommitCommand,
  UiAsyncStoreCommitResult,
  UiAsyncStoreSnapshot
} from "./async-store-types.js";

const defaultIdempotencyLimit = 1024;

export interface UiAsyncMemoryStoreOptions {
  readonly createRevision?: (previousRevision: string) => string;
  readonly idempotencyLimit?: number;
  readonly initialSnapshot?: UiAsyncStoreSnapshot;
}

export interface UiAsyncMemoryStoreAdapter extends UiAsyncStoreAdapter {
  publish(snapshot: UiAsyncStoreSnapshot): void;
  snapshot(): UiAsyncStoreSnapshot | undefined;
}

export function createAsyncMemoryStoreAdapter(
  version: string,
  options: UiAsyncMemoryStoreOptions = {}
): UiAsyncMemoryStoreAdapter {
  assertConfiguration(version, options.idempotencyLimit);
  return new AsyncMemoryStoreAdapter(version, options);
}

class AsyncMemoryStoreAdapter implements UiAsyncMemoryStoreAdapter {
  readonly #committed = new Map<string, UiAsyncStoreCommitResult>();
  readonly #createRevision: ((previousRevision: string) => string) | undefined;
  readonly #idempotencyLimit: number;
  readonly #listeners = new Set<(snapshot: UiAsyncStoreSnapshot) => void>();
  #revisionSequence = 0;
  #snapshot: UiAsyncStoreSnapshot | undefined;

  constructor(
    readonly version: string,
    options: UiAsyncMemoryStoreOptions
  ) {
    this.#snapshot = cloneSnapshot(options.initialSnapshot);
    this.#idempotencyLimit = options.idempotencyLimit ?? defaultIdempotencyLimit;
    this.#createRevision = options.createRevision;
  }

  commit(command: UiAsyncStoreAdapterCommitCommand): Promise<UiAsyncStoreCommitResult> {
    const result = commitMemory(
      command,
      this.#snapshot,
      (previous) => this.#nextRevision(previous),
      (next, accepted) => this.#accept(command.idempotencyKey, next, accepted),
      this.#committed
    );
    return Promise.resolve(result);
  }

  load(): Promise<UiAsyncStoreSnapshot | undefined> {
    return Promise.resolve(cloneSnapshot(this.#snapshot));
  }

  publish(snapshot: UiAsyncStoreSnapshot): void {
    this.#snapshot = structuredClone(snapshot);
    publishSnapshot(this.#listeners, snapshot);
  }

  snapshot(): UiAsyncStoreSnapshot | undefined {
    return cloneSnapshot(this.#snapshot);
  }

  subscribe(listener: (snapshot: UiAsyncStoreSnapshot) => void): () => void {
    return subscribeListener(this.#listeners, listener);
  }

  #accept(key: string, snapshot: UiAsyncStoreSnapshot, result: UiAsyncStoreCommitResult): void {
    this.#snapshot = snapshot;
    rememberResult(this.#committed, key, result, this.#idempotencyLimit);
  }

  #nextRevision(previousRevision: string): string {
    if (this.#createRevision !== undefined) return this.#createRevision(previousRevision);
    this.#revisionSequence += 1;
    return `memory-${this.#revisionSequence}`;
  }
}

function commitMemory(
  command: UiAsyncStoreAdapterCommitCommand,
  current: UiAsyncStoreSnapshot | undefined,
  createRevision: (previousRevision: string) => string,
  accept: (snapshot: UiAsyncStoreSnapshot, result: UiAsyncStoreCommitResult) => void,
  committed: ReadonlyMap<string, UiAsyncStoreCommitResult>
): UiAsyncStoreCommitResult {
  const replay = committed.get(command.idempotencyKey);
  if (replay !== undefined) return structuredClone(replay);
  return commitFresh(command, current, createRevision, accept);
}

function commitFresh(
  command: UiAsyncStoreAdapterCommitCommand,
  current: UiAsyncStoreSnapshot | undefined,
  createRevision: (previousRevision: string) => string,
  accept: (snapshot: UiAsyncStoreSnapshot, result: UiAsyncStoreCommitResult) => void
): UiAsyncStoreCommitResult {
  const rejection = memoryCommitRejection(command, current);
  if (rejection !== undefined) return rejection;
  const snapshot = committedSnapshot(command, createRevision(command.expectedRevision));
  if (snapshot instanceof Error) return failure("invalid");
  const result = { snapshot: structuredClone(snapshot), status: "committed" } as const;
  accept(snapshot, result);
  return structuredClone(result);
}

function memoryCommitRejection(
  command: UiAsyncStoreAdapterCommitCommand,
  current: UiAsyncStoreSnapshot | undefined
): UiAsyncStoreCommitResult | undefined {
  return [cancelledMemoryCommit(command), conflictingMemoryCommit(command, current)].find(
    (result) => result !== undefined
  );
}

function cancelledMemoryCommit(
  command: UiAsyncStoreAdapterCommitCommand
): UiAsyncStoreCommitResult | undefined {
  return command.signal?.aborted === true ? failure("cancelled") : undefined;
}

function conflictingMemoryCommit(
  command: UiAsyncStoreAdapterCommitCommand,
  current: UiAsyncStoreSnapshot | undefined
): UiAsyncStoreCommitResult | undefined {
  return current?.revision === command.expectedRevision ? undefined : failure("conflict");
}

function committedSnapshot(
  command: UiAsyncStoreAdapterCommitCommand,
  revision: string
): UiAsyncStoreSnapshot | Error {
  if (!validIdentity(revision)) return new Error("Revision is invalid.");
  if (revision === command.expectedRevision) return new Error("Revision did not advance.");
  return {
    dataVersion: command.dataVersion,
    revision,
    value: structuredClone(command.candidate)
  };
}

function rememberResult(
  results: Map<string, UiAsyncStoreCommitResult>,
  key: string,
  result: UiAsyncStoreCommitResult,
  limit: number
): void {
  results.set(key, structuredClone(result));
  if (results.size <= limit) return;
  const oldest = results.keys().next().value as string | undefined;
  if (oldest !== undefined) results.delete(oldest);
}

function subscribeListener(
  listeners: Set<(snapshot: UiAsyncStoreSnapshot) => void>,
  listener: (snapshot: UiAsyncStoreSnapshot) => void
): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function publishSnapshot(
  listeners: ReadonlySet<(snapshot: UiAsyncStoreSnapshot) => void>,
  snapshot: UiAsyncStoreSnapshot
): void {
  listeners.forEach((listener) => safelyNotify(listener, snapshot));
}

function safelyNotify(
  listener: (snapshot: UiAsyncStoreSnapshot) => void,
  snapshot: UiAsyncStoreSnapshot
): void {
  try {
    listener(structuredClone(snapshot));
  } catch {
    // One subscriber cannot interrupt other subscribers.
  }
}

function cloneSnapshot(value: UiAsyncStoreSnapshot | undefined): UiAsyncStoreSnapshot | undefined {
  return value === undefined ? undefined : structuredClone(value);
}

function failure(status: "cancelled" | "conflict" | "invalid"): UiAsyncStoreCommitResult {
  return { status };
}

function assertConfiguration(version: string, limit = defaultIdempotencyLimit): void {
  if (!validIdentity(version)) throw new Error("Async memory store version is invalid.");
  assertIdempotencyLimit(limit);
}

function assertIdempotencyLimit(limit: number): void {
  const valid = [Number.isInteger(limit), limit >= 1, limit <= 4096];
  if (!valid.every(Boolean)) throw new Error("Async memory store idempotency limit is invalid.");
}

function validIdentity(value: string): boolean {
  const characters = [...value];
  return [
    characters.length > 0,
    characters.length <= 256,
    characters.every(visibleCharacter)
  ].every(Boolean);
}

function visibleCharacter(character: string): boolean {
  const code = character.codePointAt(0) ?? 0;
  return code > 31 && code !== 127;
}
