import type { JsonValue } from "@unislang/unifold-contracts";

import type {
  ControlPlaneAuditEntry,
  ControlPlaneAuthorizationRequest,
  ControlPlaneBackupReceipt,
  ControlPlaneDecision,
  ControlPlaneDocumentRevision,
  ControlPlaneEffectExecution,
  ControlPlaneEffectLeaseStatus,
  ControlPlaneGrant,
  ControlPlaneRealtimeBatch,
  ControlPlaneRequestMetadata,
  ControlPlaneRestoreReceipt,
  ControlPlaneResult,
  ControlPlaneTrustedSession
} from "./types.js";

export interface ControlPlaneIdentityPort {
  resolve(sessionToken: string): Promise<ControlPlaneTrustedSession | undefined>;
}

export interface ControlPlaneAuthorizationPort {
  decide(request: ControlPlaneAuthorizationRequest): Promise<ControlPlaneDecision>;
}

export interface ControlPlaneEffectHandler {
  readonly invoke: (input: JsonValue, signal?: AbortSignal) => Promise<JsonValue>;
}

export interface ControlPlaneEffectRegistryPort {
  resolve(effectId: string): ControlPlaneEffectHandler | undefined;
}

export interface ControlPlaneEffectLease {
  readonly result?: ControlPlaneResult<ControlPlaneEffectExecution>;
  readonly status: ControlPlaneEffectLeaseStatus;
}

export interface ControlPlaneCommitCommand {
  readonly actorId: string;
  readonly correlationId: string;
  readonly document: Readonly<Record<string, JsonValue | undefined>>;
  readonly expectedRevision?: string;
  readonly objectId: string;
  readonly occurredAt: string;
  readonly requestId: string;
  readonly tenantId: string;
  readonly traceparent?: string;
}

export interface ControlPlaneEffectLeaseCommand {
  readonly effectId: string;
  readonly fingerprint: string;
  readonly idempotencyKey: string;
  readonly objectId: string;
  readonly tenantId: string;
}

export interface ControlPlaneCompleteEffectCommand
  extends ControlPlaneEffectLeaseCommand,
    ControlPlaneRequestMetadata {
  readonly actorId: string;
  readonly completedAt: string;
  readonly output: JsonValue;
}

export interface ControlPlaneFailEffectCommand
  extends ControlPlaneEffectLeaseCommand,
    ControlPlaneRequestMetadata {
  readonly actorId: string;
  readonly completedAt: string;
}

export interface ControlPlaneRecoveryCommand extends ControlPlaneRequestMetadata {
  readonly actorId: string;
  readonly backupId?: string;
  readonly occurredAt: string;
  readonly tenantId: string;
}

/**
 * Durable adapters keep each mutation's state, audit metadata, idempotency result, and outbox
 * notification atomic. The reference adapter supplies the same observable contract in memory.
 */
export interface ControlPlaneStorePort {
  appendAudit(entry: ControlPlaneAuditEntry): Promise<void>;
  beginEffect(command: ControlPlaneEffectLeaseCommand): Promise<ControlPlaneEffectLease>;
  commitDocument(
    command: ControlPlaneCommitCommand
  ): Promise<ControlPlaneResult<ControlPlaneDocumentRevision>>;
  completeEffect(
    command: ControlPlaneCompleteEffectCommand
  ): Promise<ControlPlaneResult<ControlPlaneEffectExecution>>;
  createBackup(
    command: ControlPlaneRecoveryCommand
  ): Promise<ControlPlaneResult<ControlPlaneBackupReceipt>>;
  failEffect(
    command: ControlPlaneFailEffectCommand
  ): Promise<ControlPlaneResult<ControlPlaneEffectExecution>>;
  readDocument(
    tenantId: string,
    objectId: string
  ): Promise<ControlPlaneDocumentRevision | undefined>;
  restoreBackup(
    command: ControlPlaneRecoveryCommand & { readonly backupId: string }
  ): Promise<ControlPlaneResult<ControlPlaneRestoreReceipt>>;
  resumeRealtime(
    tenantId: string,
    afterSequence: number
  ): Promise<ControlPlaneResult<ControlPlaneRealtimeBatch>>;
}

export interface ControlPlaneClockPort {
  now(): string;
}

export interface ControlPlaneFingerprintPort {
  fingerprint(value: JsonValue): Promise<string>;
}

export interface ControlPlaneServicePorts {
  readonly authorization: ControlPlaneAuthorizationPort;
  readonly clock: ControlPlaneClockPort;
  readonly effects: ControlPlaneEffectRegistryPort;
  readonly fingerprint: ControlPlaneFingerprintPort;
  readonly identity: ControlPlaneIdentityPort;
  readonly store: ControlPlaneStorePort;
}

export interface ReferenceControlPlaneOptions {
  readonly clock?: ControlPlaneClockPort;
  readonly effects?: Readonly<Record<string, ControlPlaneEffectHandler>>;
  readonly grants?: readonly ControlPlaneGrant[];
  readonly maxDocumentsPerTenant?: number | undefined;
  readonly realtimeRetention?: number | undefined;
  readonly sessions?: Readonly<Record<string, ControlPlaneTrustedSession>>;
}
