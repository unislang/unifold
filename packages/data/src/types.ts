import type { DataClassification, JsonObject, JsonValue } from "@unislang/unifold-contracts";

export enum DataProtocolVersion {
  Version1 = "1.0.0"
}

export enum DataSchemaUri {
  Version1 = "https://schemas.unifold.org/data/1.0/schema.json"
}

export enum DataOperationKind {
  Mutation = "mutation",
  Query = "query"
}

export enum DataResultStatus {
  Canceled = "canceled",
  Conflict = "conflict",
  Denied = "denied",
  Empty = "empty",
  NotFound = "not-found",
  RateLimited = "rate-limited",
  Success = "success",
  Timeout = "timeout",
  Unavailable = "unavailable",
  ValidationError = "validation-error"
}

export enum DataErrorCode {
  AdapterFailure = "adapter-failure",
  Canceled = "canceled",
  Conflict = "conflict",
  Denied = "denied",
  InvalidRequest = "invalid-request",
  NotFound = "not-found",
  OperationNotRegistered = "operation-not-registered",
  Offline = "offline",
  RateLimited = "rate-limited",
  Superseded = "superseded",
  Timeout = "timeout",
  Unavailable = "unavailable"
}

export enum DataOfflineBehavior {
  Fail = "fail",
  LastKnownGood = "last-known-good"
}

export enum DataActorDisposition {
  Cache = "cache",
  Committed = "committed",
  Discarded = "discarded"
}

export enum DataSortDirection {
  Ascending = "ascending",
  Descending = "descending"
}

export interface DataCachePolicy extends JsonObject {
  readonly freshForMs: number;
  readonly offline: DataOfflineBehavior;
  readonly retainForMs: number;
}

export interface DataPageIntent extends JsonObject {
  readonly after?: string;
  readonly before?: string;
  readonly limit: number;
}

export interface DataSort extends JsonObject {
  readonly direction: DataSortDirection;
  readonly field: string;
}

export interface DataRequestBase extends JsonObject {
  readonly correlationId: string;
  readonly filter?: JsonObject;
  readonly operationId: string;
  readonly protocolVersion: DataProtocolVersion;
  readonly requestId: string;
  readonly sort?: readonly DataSort[];
  readonly timeoutMs?: number;
  readonly variables: JsonObject;
}

export interface DataQueryRequest extends DataRequestBase {
  readonly cache: DataCachePolicy;
  readonly kind: DataOperationKind.Query;
  readonly page?: DataPageIntent;
}

export interface DataMutationRequest extends DataRequestBase {
  readonly expectedRevision?: string;
  readonly idempotencyKey: string;
  readonly invalidateTags: readonly string[];
  readonly kind: DataOperationKind.Mutation;
}

export type DataRequest = DataMutationRequest | DataQueryRequest;

export interface DataError extends JsonObject {
  readonly code: DataErrorCode | string;
  readonly details?: JsonObject;
  readonly messageKey: string;
  readonly retryAfterMs?: number;
}

export interface DataSuccessResult extends JsonObject {
  readonly classification: DataClassification;
  readonly data: JsonValue;
  readonly invalidationTags: readonly string[];
  readonly nextCursor?: string;
  readonly previousCursor?: string;
  readonly receivedAt: string;
  readonly revision?: string;
  readonly status: DataResultStatus.Success;
}

export interface DataEmptyResult extends JsonObject {
  readonly classification: DataClassification;
  readonly invalidationTags: readonly string[];
  readonly receivedAt: string;
  readonly revision?: string;
  readonly status: DataResultStatus.Empty;
}

export interface DataFailureResult extends JsonObject {
  readonly error: DataError;
  readonly status: Exclude<DataResultStatus, DataResultStatus.Empty | DataResultStatus.Success>;
}

export type DataResult = DataEmptyResult | DataFailureResult | DataSuccessResult;
export type DataCacheableResult = DataEmptyResult | DataSuccessResult;

export interface DataActorResolution {
  readonly attempts: number;
  readonly disposition: DataActorDisposition;
  readonly result: DataResult;
}

export interface DataSourceInvocation {
  readonly request: DataRequest;
  readonly signal: AbortSignal;
}

export type DataSourceHandler = (invocation: DataSourceInvocation) => Promise<DataResult>;

export interface DataClockPort {
  now(): string;
}

export interface DataOnlinePort {
  isOnline(): boolean;
}

export interface DataRetryPolicy {
  readonly baseDelayMs: number;
  readonly jitterRatio: number;
  readonly maxAttempts: number;
  readonly maxDelayMs: number;
}

export interface DataOptimisticLease {
  commit(result: DataCacheableResult): void | Promise<void>;
  rollback(result: DataFailureResult): void | Promise<void>;
}

export interface DataOptimisticPort {
  apply(request: DataMutationRequest): DataOptimisticLease | Promise<DataOptimisticLease>;
}

export interface DataInvalidationMessage extends JsonObject {
  readonly occurredAt: string;
  readonly revision?: string;
  readonly sourceId: string;
  readonly tags: readonly string[];
}

export interface DataInvalidationBusPort {
  publish(message: DataInvalidationMessage): void | Promise<void>;
  subscribe(listener: (message: DataInvalidationMessage) => void): () => void;
}

export interface DataActorCoordinatorOptions {
  readonly cache?: DataQueryCachePort;
  readonly clock?: DataClockPort;
  readonly invalidationBus?: DataInvalidationBusPort;
  readonly online?: DataOnlinePort;
  readonly optimistic?: DataOptimisticPort;
  readonly random?: () => number;
  readonly registry: DataSourceRegistryPort;
  readonly retry?: Partial<DataRetryPolicy>;
  readonly sourceId?: string;
}

export interface DataQueryCachePort {
  clear(): void;
  get(request: DataQueryRequest): DataCacheableResult | undefined;
  invalidateTags(tags: readonly string[]): number;
  set(request: DataQueryRequest, result: DataCacheableResult): void;
  readonly size: number;
}

export interface DataSourceRegistryPort {
  resolve(operationId: string): DataSourceHandler | undefined;
}
