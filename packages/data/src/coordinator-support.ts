import { DataQueryCache } from "./cache.js";
import { resolveDataRetryPolicy } from "./retry.js";
import {
  DataActorDisposition,
  DataErrorCode,
  DataOfflineBehavior,
  DataResultStatus,
  type DataActorCoordinatorOptions,
  type DataActorResolution,
  type DataCacheableResult,
  type DataClockPort,
  type DataFailureResult,
  type DataInvalidationBusPort,
  type DataInvalidationMessage,
  type DataMutationRequest,
  type DataOnlinePort,
  type DataOptimisticLease,
  type DataOptimisticPort,
  type DataQueryCachePort,
  type DataQueryRequest,
  type DataRequest,
  type DataResult,
  type DataRetryPolicy,
  type DataSourceHandler,
  type DataSourceRegistryPort
} from "./types.js";
import { dataRequestErrors } from "./validation.js";

export interface ActiveRequest {
  readonly controller: AbortController;
  readonly detach: () => void;
}

interface CoordinatorDependencies {
  readonly cache: DataQueryCachePort;
  readonly clock: DataClockPort;
  readonly invalidationBus: DataInvalidationBusPort | undefined;
  readonly online: DataOnlinePort;
  readonly optimistic: DataOptimisticPort | undefined;
  readonly random: () => number;
  readonly registry: DataSourceRegistryPort;
  readonly retry: DataRetryPolicy;
  readonly sourceId: string;
}

type Preflight =
  | { readonly handler: DataSourceHandler }
  | { readonly resolution: DataActorResolution };
export type OptimisticStart =
  | { readonly lease: DataOptimisticLease | undefined; readonly ok: true }
  | { readonly ok: false; readonly resolution: DataActorResolution };
export interface DataExecution {
  readonly attempts: number;
  readonly result: DataResult;
}

const defaultRetry: DataRetryPolicy = Object.freeze({
  baseDelayMs: 200,
  jitterRatio: 0.2,
  maxAttempts: 3,
  maxDelayMs: 5_000
});

export function resolveDependencies(options: DataActorCoordinatorOptions): CoordinatorDependencies {
  return {
    cache: valueOr(options.cache, () => new DataQueryCache()),
    clock: valueOr(options.clock, () => ({ now: () => new Date().toISOString() })),
    invalidationBus: options.invalidationBus,
    online: valueOr(options.online, () => ({ isOnline: () => true })),
    optimistic: options.optimistic,
    random: valueOr(options.random, () => Math.random),
    registry: options.registry,
    retry: resolveDataRetryPolicy(defaultRetry, options.retry),
    sourceId: valueOr(options.sourceId, () => crypto.randomUUID())
  };
}

export function dataPreflight(registry: DataSourceRegistryPort, request: DataRequest): Preflight {
  const errors = dataRequestErrors(request);
  if (errors.length > 0) return { resolution: invalidRequest(errors) };
  return registeredPreflight(registry, request.operationId);
}

export function subscribeInvalidation(
  bus: DataInvalidationBusPort | undefined,
  listener: (message: DataInvalidationMessage) => void
): (() => void) | undefined {
  if (bus === undefined) return undefined;
  return bus.subscribe(listener);
}

export function linkAbortSignal(
  signal: AbortSignal | undefined,
  controller: AbortController
): () => void {
  if (signal === undefined) return () => undefined;
  if (signal.aborted) controller.abort();
  const abort = () => controller.abort();
  signal.addEventListener("abort", abort, { once: true });
  return () => signal.removeEventListener("abort", abort);
}

export function stopOptionalActive(active: ActiveRequest | undefined): void {
  if (active !== undefined) stopActive(active);
}

export function stopActive(active: ActiveRequest): void {
  active.detach();
  active.controller.abort();
}

export function isFresh(
  cached: DataCacheableResult | undefined,
  request: DataQueryRequest,
  now: string
): cached is DataCacheableResult {
  if (cached === undefined) return false;
  return Date.parse(cached.receivedAt) + request.cache.freshForMs > Date.parse(now);
}

export function offlineQueryResolution(
  cached: DataCacheableResult | undefined,
  request: DataQueryRequest
): DataActorResolution {
  if (cached === undefined) return resolution(DataActorDisposition.Committed, offline(), 0);
  return request.cache.offline === DataOfflineBehavior.LastKnownGood
    ? resolution(DataActorDisposition.Cache, cached, 0)
    : resolution(DataActorDisposition.Committed, offline(), 0);
}

export function isCacheable(result: DataResult): result is DataCacheableResult {
  return [DataResultStatus.Success, DataResultStatus.Empty].includes(result.status);
}

export async function commitFailure(
  execution: DataExecution,
  optimistic: DataOptimisticLease | undefined
): Promise<DataActorResolution> {
  const result = execution.result as DataFailureResult;
  await rollback(optimistic, result);
  return resolution(DataActorDisposition.Committed, result, execution.attempts);
}

export async function commitOptimistic(
  optimistic: DataOptimisticLease | undefined,
  result: DataCacheableResult
): Promise<void> {
  try {
    await optimistic?.commit(result);
  } catch {
    // Server success remains authoritative; host recovery owns an optimistic projection failure.
  }
}

export function invalidationMessage(
  request: DataMutationRequest,
  result: DataCacheableResult,
  occurredAt: string,
  sourceId: string
): DataInvalidationMessage {
  const base = { occurredAt, sourceId, tags: request.invalidateTags };
  return result.revision === undefined ? base : { ...base, revision: result.revision };
}

export async function publishInvalidation(
  bus: DataInvalidationBusPort | undefined,
  message: DataInvalidationMessage
): Promise<void> {
  if (bus === undefined) return;
  try {
    await bus.publish(message);
  } catch {
    // A committed mutation cannot be reported as failed because notification transport failed.
  }
}

export function shouldRetry(
  result: DataResult,
  attempts: number,
  policy: DataRetryPolicy
): result is DataFailureResult {
  if (attempts >= policy.maxAttempts) return false;
  return [
    DataResultStatus.RateLimited,
    DataResultStatus.Timeout,
    DataResultStatus.Unavailable
  ].includes(result.status);
}

export function optimisticApplyFailure(): DataActorResolution {
  return resolution(
    DataActorDisposition.Committed,
    failure(
      DataResultStatus.Unavailable,
      DataErrorCode.AdapterFailure,
      "data.optimisticApplyFailure"
    ),
    0
  );
}

export async function discard(
  optimistic: DataOptimisticLease | undefined,
  attempts: number
): Promise<DataActorResolution> {
  const result = failure(DataResultStatus.Canceled, DataErrorCode.Superseded, "data.superseded");
  await rollback(optimistic, result);
  return resolution(DataActorDisposition.Discarded, result, attempts);
}

export async function canceledResolution(
  optimistic: DataOptimisticLease | undefined,
  attempts: number
): Promise<DataActorResolution> {
  const result = failure(DataResultStatus.Canceled, DataErrorCode.Canceled, "data.canceled");
  await rollback(optimistic, result);
  return resolution(DataActorDisposition.Committed, result, attempts);
}

export function resolution(
  disposition: DataActorDisposition,
  result: DataResult,
  attempts: number
): DataActorResolution {
  return { attempts, disposition, result };
}

function valueOr<T>(value: T | undefined, fallback: () => T): T {
  return value === undefined ? fallback() : value;
}

function registeredPreflight(registry: DataSourceRegistryPort, operationId: string): Preflight {
  const handler = registry.resolve(operationId);
  return handler === undefined ? { resolution: unregisteredOperation() } : { handler };
}

function invalidRequest(errors: readonly string[]): DataActorResolution {
  return resolution(
    DataActorDisposition.Committed,
    failure(DataResultStatus.ValidationError, DataErrorCode.InvalidRequest, "data.invalidRequest", {
      fields: errors
    }),
    0
  );
}

function unregisteredOperation(): DataActorResolution {
  return resolution(
    DataActorDisposition.Committed,
    failure(
      DataResultStatus.ValidationError,
      DataErrorCode.OperationNotRegistered,
      "data.operationNotRegistered"
    ),
    0
  );
}

function failure(
  status: DataFailureResult["status"],
  code: DataErrorCode,
  messageKey: string,
  details?: Record<string, readonly string[]>
): DataFailureResult {
  return {
    error: details === undefined ? { code, messageKey } : { code, details, messageKey },
    status
  };
}

function offline(): DataFailureResult {
  return failure(DataResultStatus.Unavailable, DataErrorCode.Offline, "data.offline");
}

async function rollback(
  optimistic: DataOptimisticLease | undefined,
  result: DataFailureResult
): Promise<void> {
  await optimistic?.rollback(result);
}
