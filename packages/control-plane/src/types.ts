import type { JsonObject, JsonValue } from "@unislang/unifold-contracts";

export enum ControlPlaneProtocolVersion {
  Version1 = "1.0.0"
}

export enum ControlPlaneSchemaUri {
  Version1 = "https://schemas.unifold.org/control-plane/1.0/schema.json"
}

export enum ControlPlaneTenantIsolationTier {
  SharedSchemaTenantKey = "shared-schema-tenant-key"
}

export enum ControlPlaneCapability {
  BackupCreate = "backup.create",
  BackupRestore = "backup.restore",
  CollaborationApprove = "collaboration.approve",
  CollaborationComment = "collaboration.comment",
  CollaborationPresence = "collaboration.presence",
  CollaborationPropose = "collaboration.propose",
  CollaborationPublish = "collaboration.publish",
  CollaborationUndo = "collaboration.undo",
  DocumentCommit = "document.commit",
  DocumentRead = "document.read",
  EffectInvoke = "effect.invoke",
  RealtimeResume = "realtime.resume"
}

export enum ControlPlaneOperation {
  BackupCreate = "backup.create",
  BackupRestore = "backup.restore",
  DocumentCommit = "document.commit",
  DocumentRead = "document.read",
  EffectInvoke = "effect.invoke",
  RealtimeResume = "realtime.resume"
}

export enum ControlPlaneDecision {
  Allow = "allow",
  Deny = "deny"
}

export enum ControlPlaneOperationStatus {
  Conflict = "conflict",
  Denied = "denied",
  Failed = "failed",
  Gap = "gap",
  Invalid = "invalid",
  NotFound = "not-found",
  Succeeded = "succeeded",
  Unavailable = "unavailable"
}

export enum ControlPlaneErrorCode {
  AuthorizationDenied = "authorization-denied",
  BackupNotFound = "backup-not-found",
  BackupIntegrityFailed = "backup-integrity-failed",
  DocumentConflict = "document-conflict",
  DocumentNotFound = "document-not-found",
  EffectFailed = "effect-failed",
  EffectInProgress = "effect-in-progress",
  EffectNotRegistered = "effect-not-registered",
  IdempotencyConflict = "idempotency-conflict",
  InvalidRequest = "invalid-request",
  RealtimeGap = "realtime-gap",
  SessionInvalid = "session-invalid",
  TenantQuotaExceeded = "tenant-quota-exceeded",
  TransportUnavailable = "transport-unavailable"
}

export enum ControlPlaneRealtimeMessageType {
  DocumentCommitted = "document-committed",
  EffectCompleted = "effect-completed",
  TenantRestored = "tenant-restored"
}

export enum ControlPlaneAuditAction {
  BackupCreated = "backup-created",
  BackupRestored = "backup-restored",
  DocumentCommitted = "document-committed",
  DocumentRead = "document-read",
  EffectInvoked = "effect-invoked",
  RequestDenied = "request-denied"
}

export enum ControlPlaneAuditOutcome {
  Denied = "denied",
  Failed = "failed",
  Succeeded = "succeeded"
}

export enum ControlPlaneEffectLeaseStatus {
  Acquired = "acquired",
  Conflict = "conflict",
  InProgress = "in-progress",
  Replay = "replay"
}

export interface ControlPlaneRequestMetadata extends JsonObject {
  readonly correlationId: string;
  readonly protocolVersion: ControlPlaneProtocolVersion;
  readonly requestId: string;
  readonly traceparent?: string;
}

export interface ControlPlaneAuthenticatedRequest extends ControlPlaneRequestMetadata {
  readonly operation: ControlPlaneOperation;
  readonly sessionToken: string;
}

export interface ControlPlaneTrustedSession extends JsonObject {
  readonly actorId: string;
  readonly capabilities: readonly ControlPlaneCapability[];
  readonly sessionId: string;
  readonly tenantId: string;
}

export interface ControlPlaneAuthorizationRequest {
  readonly capability: ControlPlaneCapability;
  readonly resourceId: string;
  readonly session: ControlPlaneTrustedSession;
}

export interface ControlPlaneError extends JsonObject {
  readonly code: ControlPlaneErrorCode;
  readonly messageKey: string;
}

export interface ControlPlaneResult<TValue> {
  readonly error?: ControlPlaneError;
  readonly status: ControlPlaneOperationStatus;
  readonly value?: TValue;
}

export interface ControlPlaneCommitDocumentRequest extends ControlPlaneAuthenticatedRequest {
  readonly document: JsonObject;
  readonly expectedRevision?: string;
  readonly objectId: string;
  readonly operation: ControlPlaneOperation.DocumentCommit;
}

export interface ControlPlaneReadDocumentRequest extends ControlPlaneAuthenticatedRequest {
  readonly objectId: string;
  readonly operation: ControlPlaneOperation.DocumentRead;
}

export interface ControlPlaneInvokeEffectRequest extends ControlPlaneAuthenticatedRequest {
  readonly effectId: string;
  readonly idempotencyKey: string;
  readonly input: JsonValue;
  readonly objectId: string;
  readonly operation: ControlPlaneOperation.EffectInvoke;
}

export interface ControlPlaneResumeRealtimeRequest extends ControlPlaneAuthenticatedRequest {
  readonly afterSequence: number;
  readonly operation: ControlPlaneOperation.RealtimeResume;
}

export interface ControlPlaneBackupRequest extends ControlPlaneAuthenticatedRequest {
  readonly operation: ControlPlaneOperation.BackupCreate;
}

export interface ControlPlaneRestoreRequest extends ControlPlaneAuthenticatedRequest {
  readonly backupId: string;
  readonly operation: ControlPlaneOperation.BackupRestore;
}

export interface ControlPlaneDocumentRevision extends JsonObject {
  readonly actorId: string;
  readonly committedAt: string;
  readonly document: JsonObject;
  readonly objectId: string;
  readonly parentRevision?: string;
  readonly revision: string;
  readonly tenantId: string;
}

export interface ControlPlaneEffectExecution extends JsonObject {
  readonly completedAt: string;
  readonly effectId: string;
  readonly idempotencyKey: string;
  readonly objectId: string;
  readonly output: JsonValue;
  readonly replayed: boolean;
  readonly tenantId: string;
}

export interface ControlPlaneRealtimeMessage extends JsonObject {
  readonly correlationId: string;
  readonly occurredAt: string;
  readonly payload: JsonObject;
  readonly sequence: number;
  readonly tenantId: string;
  readonly type: ControlPlaneRealtimeMessageType;
}

export interface ControlPlaneRealtimeBatch extends JsonObject {
  readonly latestSequence: number;
  readonly messages: readonly ControlPlaneRealtimeMessage[];
  readonly oldestAvailableSequence: number;
}

export interface ControlPlaneBackupReceipt extends JsonObject {
  readonly backupId: string;
  readonly createdAt: string;
  readonly sha256: string;
  readonly tenantId: string;
}

export interface ControlPlaneRestoreReceipt extends JsonObject {
  readonly backupId: string;
  readonly restoredAt: string;
  readonly tenantId: string;
}

export interface ControlPlaneAuditEntry extends JsonObject {
  readonly action: ControlPlaneAuditAction;
  readonly actorId: string;
  readonly correlationId: string;
  readonly details: JsonObject;
  readonly occurredAt: string;
  readonly outcome: ControlPlaneAuditOutcome;
  readonly requestId: string;
  readonly tenantId: string;
  readonly traceparent?: string;
}

export interface ControlPlaneGrant extends JsonObject {
  readonly actorId: string;
  readonly capability: ControlPlaneCapability;
  readonly resourceId: string;
  readonly tenantId: string;
}
