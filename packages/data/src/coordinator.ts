import {
  type ActiveRequest,
  canceledResolution,
  commitFailure,
  commitOptimistic,
  dataPreflight,
  type DataExecution,
  discard,
  invalidationMessage,
  isCacheable,
  isFresh,
  linkAbortSignal,
  offlineQueryResolution,
  type OptimisticStart,
  optimisticApplyFailure,
  publishInvalidation,
  resolution,
  resolveDependencies,
  shouldRetry,
  stopActive,
  stopOptionalActive,
  subscribeInvalidation
} from "./coordinator-support.js";
import { invokeDataSource } from "./invocation.js";
import { dataRetryDelay, waitForDataRetry } from "./retry.js";
import {
  DataActorDisposition,
  DataErrorCode,
  DataOperationKind,
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
  type DataRetryPolicy,
  type DataSourceHandler,
  type DataSourceRegistryPort
} from "./types.js";

export class DataActorCoordinator {
  private readonly active = new Map<string, ActiveRequest>();
  private readonly cache: DataQueryCachePort;
  private readonly clock: DataClockPort;
  private readonly invalidationBus: DataInvalidationBusPort | undefined;
  private readonly online: DataOnlinePort;
  private readonly optimistic: DataOptimisticPort | undefined;
  private readonly random: () => number;
  private readonly registry: DataSourceRegistryPort;
  private readonly retry: DataRetryPolicy;
  private readonly sourceId: string;
  private readonly unsubscribe: (() => void) | undefined;

  constructor(options: DataActorCoordinatorOptions) {
    const dependencies = resolveDependencies(options);
    this.cache = dependencies.cache;
    this.clock = dependencies.clock;
    this.invalidationBus = dependencies.invalidationBus;
    this.online = dependencies.online;
    this.optimistic = dependencies.optimistic;
    this.random = dependencies.random;
    this.registry = dependencies.registry;
    this.retry = dependencies.retry;
    this.sourceId = dependencies.sourceId;
    this.unsubscribe = subscribeInvalidation(this.invalidationBus, (message) =>
      this.receiveInvalidation(message)
    );
  }

  get cacheSize(): number {
    return this.cache.size;
  }

  cancel(actorId: string): boolean {
    const active = this.active.get(actorId);
    active?.controller.abort();
    return active !== undefined;
  }

  dispose(): void {
    for (const request of this.active.values()) stopActive(request);
    this.active.clear();
    this.unsubscribe?.();
  }

  async execute(
    actorId: string,
    request: DataRequest,
    externalSignal?: AbortSignal
  ): Promise<DataActorResolution> {
    const preflight = dataPreflight(this.registry, request);
    if ("resolution" in preflight) return preflight.resolution;
    return this.executeRegistered(actorId, request, preflight.handler, externalSignal);
  }

  private executeRegistered(
    actorId: string,
    request: DataRequest,
    handler: DataSourceHandler,
    externalSignal: AbortSignal | undefined
  ): Promise<DataActorResolution> {
    const immediate = this.cachedResolution(request);
    if (immediate !== undefined) return Promise.resolve(immediate);
    return this.executeRemote(actorId, request, handler, externalSignal);
  }

  private executeRemote(
    actorId: string,
    request: DataRequest,
    handler: DataSourceHandler,
    externalSignal: AbortSignal | undefined
  ): Promise<DataActorResolution> {
    const active = this.start(actorId, externalSignal);
    return request.kind === DataOperationKind.Mutation
      ? this.executeRemoteMutation(actorId, active, request, handler)
      : this.executeRemoteStarted(actorId, active, request, handler, {
          lease: undefined,
          ok: true
        });
  }

  private async executeRemoteMutation(
    actorId: string,
    active: ActiveRequest,
    request: DataMutationRequest,
    handler: DataSourceHandler
  ): Promise<DataActorResolution> {
    const optimistic = await this.beginMutationOptimistic(request);
    return this.executeRemoteStarted(actorId, active, request, handler, optimistic);
  }

  private async executeRemoteStarted(
    actorId: string,
    active: ActiveRequest,
    request: DataRequest,
    handler: DataSourceHandler,
    optimistic: OptimisticStart
  ): Promise<DataActorResolution> {
    if (!optimistic.ok) {
      this.finish(actorId, active);
      return optimistic.resolution;
    }
    if (!this.isCurrent(actorId, active)) return discard(optimistic.lease, 0);
    const execution = await this.executeWithRetry(handler, request, active.controller.signal);
    return this.finalize(actorId, active, request, execution, optimistic.lease);
  }

  private async beginMutationOptimistic(request: DataMutationRequest): Promise<OptimisticStart> {
    if (this.optimistic === undefined) return { lease: undefined, ok: true };
    try {
      return { lease: await this.optimistic.apply(request), ok: true };
    } catch {
      return { ok: false, resolution: optimisticApplyFailure() };
    }
  }

  private finalize(
    actorId: string,
    active: ActiveRequest,
    request: DataRequest,
    execution: DataExecution,
    optimistic: DataOptimisticLease | undefined
  ): Promise<DataActorResolution> {
    if (!this.isCurrent(actorId, active)) return discard(optimistic, execution.attempts);
    this.finish(actorId, active);
    return active.controller.signal.aborted
      ? canceledResolution(optimistic, execution.attempts)
      : this.commit(request, execution, optimistic);
  }

  private cachedResolution(request: DataRequest): DataActorResolution | undefined {
    return request.kind === DataOperationKind.Query
      ? this.queryCachedResolution(request)
      : this.mutationOfflineResolution();
  }

  private queryCachedResolution(request: DataQueryRequest): DataActorResolution | undefined {
    const cached = this.cache.get(request);
    if (isFresh(cached, request, this.clock.now())) {
      return resolution(DataActorDisposition.Cache, cached, 0);
    }
    return this.online.isOnline() ? undefined : offlineQueryResolution(cached, request);
  }

  private mutationOfflineResolution(): DataActorResolution | undefined {
    return this.online.isOnline()
      ? undefined
      : resolution(DataActorDisposition.Committed, offlineFailure(), 0);
  }

  private async commit(
    request: DataRequest,
    execution: DataExecution,
    optimistic: DataOptimisticLease | undefined
  ): Promise<DataActorResolution> {
    if (!isCacheable(execution.result)) return commitFailure(execution, optimistic);
    return this.commitCacheable(request, execution.result, execution.attempts, optimistic);
  }

  private async commitCacheable(
    request: DataRequest,
    result: DataCacheableResult,
    attempts: number,
    optimistic: DataOptimisticLease | undefined
  ): Promise<DataActorResolution> {
    if (request.kind === DataOperationKind.Query) this.cache.set(request, result);
    else await this.commitMutation(request, result, optimistic);
    return resolution(DataActorDisposition.Committed, result, attempts);
  }

  private async commitMutation(
    request: DataMutationRequest,
    result: DataCacheableResult,
    optimistic: DataOptimisticLease | undefined
  ): Promise<void> {
    await commitOptimistic(optimistic, result);
    this.cache.invalidateTags(request.invalidateTags);
    const message = invalidationMessage(request, result, this.clock.now(), this.sourceId);
    await publishInvalidation(this.invalidationBus, message);
  }

  private start(actorId: string, externalSignal: AbortSignal | undefined): ActiveRequest {
    stopOptionalActive(this.active.get(actorId));
    const controller = new AbortController();
    const active = { controller, detach: linkAbortSignal(externalSignal, controller) };
    this.active.set(actorId, active);
    return active;
  }

  private finish(actorId: string, active: ActiveRequest): void {
    active.detach();
    if (this.isCurrent(actorId, active)) this.active.delete(actorId);
  }

  private isCurrent(actorId: string, active: ActiveRequest): boolean {
    return this.active.get(actorId) === active;
  }

  private executeWithRetry(
    handler: DataSourceHandler,
    request: DataRequest,
    signal: AbortSignal
  ): Promise<DataExecution> {
    return this.executeAttempt(handler, request, signal, 1);
  }

  private async executeAttempt(
    handler: DataSourceHandler,
    request: DataRequest,
    signal: AbortSignal,
    attempts: number
  ): Promise<DataExecution> {
    const result = await invokeDataSource(handler, request, signal);
    if (!shouldRetry(result, attempts, this.retry)) return { attempts, result };
    const continued = await waitForDataRetry(this.retryDelay(result, attempts), signal);
    return continued
      ? this.executeAttempt(handler, request, signal, attempts + 1)
      : { attempts, result };
  }

  private retryDelay(result: DataFailureResult, attempts: number): number {
    if (result.error.retryAfterMs !== undefined) return result.error.retryAfterMs;
    return dataRetryDelay(this.retry, attempts, this.random());
  }

  private receiveInvalidation(message: DataInvalidationMessage): void {
    if (message.sourceId !== this.sourceId) this.cache.invalidateTags(message.tags);
  }
}

function offlineFailure(): DataFailureResult {
  return {
    error: { code: DataErrorCode.Offline, messageKey: "data.offline" },
    status: DataResultStatus.Unavailable
  };
}
