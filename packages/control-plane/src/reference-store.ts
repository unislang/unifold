import type { JsonObject } from "@unislang/unifold-contracts";

import type {
  ControlPlaneFingerprintPort,
  ControlPlaneCommitCommand,
  ControlPlaneCompleteEffectCommand,
  ControlPlaneDurableStorePort,
  ControlPlaneEffectLease,
  ControlPlaneEffectLeaseCommand,
  ControlPlaneFailEffectCommand,
  ControlPlaneOutboxAcknowledgeCommand,
  ControlPlaneOutboxEntry,
  ControlPlaneOutboxLeaseCommand,
  ControlPlaneOutboxReleaseCommand,
  ControlPlaneRecoveryCommand
} from "./ports.js";
import {
  ControlPlaneAuditAction,
  ControlPlaneAuditOutcome,
  ControlPlaneEffectLeaseStatus,
  ControlPlaneErrorCode,
  ControlPlaneOperationStatus,
  ControlPlaneRealtimeMessageType,
  type ControlPlaneAuditEntry,
  type ControlPlaneBackupReceipt,
  type ControlPlaneDocumentRevision,
  type ControlPlaneEffectExecution,
  type ControlPlaneRealtimeBatch,
  type ControlPlaneRealtimeMessage,
  type ControlPlaneRestoreReceipt,
  type ControlPlaneResult
} from "./types.js";
import { ReferenceControlPlaneOutbox } from "./reference-outbox.js";
import {
  backupPayload,
  commitAudit,
  configuredFingerprint,
  configuredLimit,
  currentRevision,
  effectAudit,
  failure,
  matchesExpectedRevision,
  quotaExceeded,
  recoveryAudit,
  revisionRecord,
  succeeded
} from "./reference-store-helpers.js";

interface StoredEffect {
  readonly fingerprint: string;
  pending: boolean;
  result?: ControlPlaneResult<ControlPlaneEffectExecution>;
}

interface TenantState {
  audits: ControlPlaneAuditEntry[];
  documents: Map<string, ControlPlaneDocumentRevision>;
  effects: Map<string, StoredEffect>;
  nextRevision: number;
  outbox: ReferenceControlPlaneOutbox;
}

interface TenantBackup {
  readonly digest: string;
  readonly documents: Map<string, ControlPlaneDocumentRevision>;
  readonly effects: Map<string, StoredEffect>;
  readonly tenantId: string;
}

export interface ReferenceStoreOptions {
  readonly fingerprint?: ControlPlaneFingerprintPort | undefined;
  readonly maxDocumentsPerTenant?: number | undefined;
  readonly realtimeRetention?: number | undefined;
}

export class ReferenceControlPlaneStore implements ControlPlaneDurableStorePort {
  readonly #backups = new Map<string, TenantBackup>();
  readonly #maxDocuments: number;
  readonly #fingerprint: ControlPlaneFingerprintPort;
  readonly #retention: number;
  readonly #tenants = new Map<string, TenantState>();
  #nextBackup = 1;

  constructor(options?: ReferenceStoreOptions) {
    const configured = options ?? {};
    this.#fingerprint = configuredFingerprint(configured.fingerprint);
    this.#maxDocuments = configuredLimit(configured.maxDocumentsPerTenant, 1000);
    this.#retention = configuredLimit(configured.realtimeRetention, 1000);
  }

  async appendAudit(entry: ControlPlaneAuditEntry): Promise<void> {
    this.recordAudit(entry);
  }

  async beginEffect(command: ControlPlaneEffectLeaseCommand): Promise<ControlPlaneEffectLease> {
    const effects = this.state(command.tenantId).effects;
    const stored = effects.get(command.idempotencyKey);
    if (stored === undefined) {
      effects.set(command.idempotencyKey, { fingerprint: command.fingerprint, pending: true });
      return { status: ControlPlaneEffectLeaseStatus.Acquired };
    }
    return existingLease(stored, command.fingerprint);
  }

  async commitDocument(
    command: ControlPlaneCommitCommand
  ): Promise<ControlPlaneResult<ControlPlaneDocumentRevision>> {
    const state = this.state(command.tenantId);
    const current = state.documents.get(command.objectId);
    if (!matchesExpectedRevision(current, command.expectedRevision)) {
      this.recordAudit(commitAudit(command, ControlPlaneAuditOutcome.Failed));
      return failure(ControlPlaneOperationStatus.Conflict, ControlPlaneErrorCode.DocumentConflict);
    }
    if (quotaExceeded(current, state.documents.size, this.#maxDocuments)) {
      this.recordAudit(commitAudit(command, ControlPlaneAuditOutcome.Denied));
      return failure(ControlPlaneOperationStatus.Denied, ControlPlaneErrorCode.TenantQuotaExceeded);
    }
    const revision = this.nextRevision(state);
    const record = revisionRecord(command, revision, currentRevision(current));
    state.documents.set(command.objectId, record);
    this.publish(
      state,
      command.tenantId,
      command.correlationId,
      command.occurredAt,
      {
        objectId: command.objectId,
        revision
      },
      ControlPlaneRealtimeMessageType.DocumentCommitted
    );
    this.recordAudit(commitAudit(command, ControlPlaneAuditOutcome.Succeeded, revision));
    return succeeded(record);
  }

  async completeEffect(
    command: ControlPlaneCompleteEffectCommand
  ): Promise<ControlPlaneResult<ControlPlaneEffectExecution>> {
    const execution: ControlPlaneEffectExecution = {
      completedAt: command.completedAt,
      effectId: command.effectId,
      idempotencyKey: command.idempotencyKey,
      objectId: command.objectId,
      output: structuredClone(command.output),
      replayed: false,
      tenantId: command.tenantId
    };
    const result = succeeded(execution);
    await this.finishEffect(command, result, ControlPlaneAuditOutcome.Succeeded);
    return result;
  }

  async failEffect(
    command: ControlPlaneFailEffectCommand
  ): Promise<ControlPlaneResult<ControlPlaneEffectExecution>> {
    const result = failure<ControlPlaneEffectExecution>(
      ControlPlaneOperationStatus.Failed,
      ControlPlaneErrorCode.EffectFailed
    );
    await this.finishEffect(command, result, ControlPlaneAuditOutcome.Failed);
    return result;
  }

  async readDocument(
    tenantId: string,
    objectId: string
  ): Promise<ControlPlaneDocumentRevision | undefined> {
    return structuredClone(this.state(tenantId).documents.get(objectId));
  }

  async resumeRealtime(
    tenantId: string,
    afterSequence: number
  ): Promise<ControlPlaneResult<ControlPlaneRealtimeBatch>> {
    return this.state(tenantId).outbox.resume(afterSequence);
  }

  async leaseOutbox(
    command: ControlPlaneOutboxLeaseCommand
  ): Promise<readonly ControlPlaneOutboxEntry[]> {
    return this.state(command.tenantId).outbox.lease(command);
  }

  async acknowledgeOutbox(command: ControlPlaneOutboxAcknowledgeCommand): Promise<number> {
    return this.state(command.tenantId).outbox.acknowledge(command);
  }

  async releaseOutbox(command: ControlPlaneOutboxReleaseCommand): Promise<number> {
    return this.state(command.tenantId).outbox.release(command);
  }

  async createBackup(
    command: ControlPlaneRecoveryCommand
  ): Promise<ControlPlaneResult<ControlPlaneBackupReceipt>> {
    const state = this.state(command.tenantId);
    const backupId = `backup-${this.#nextBackup++}`;
    const digest = await this.#fingerprint.fingerprint(
      backupPayload(command.tenantId, state.documents, state.effects)
    );
    this.#backups.set(backupId, {
      digest,
      documents: structuredClone(state.documents),
      effects: structuredClone(state.effects),
      tenantId: command.tenantId
    });
    this.recordAudit(recoveryAudit(command, ControlPlaneAuditAction.BackupCreated, backupId));
    return succeeded({
      backupId,
      createdAt: command.occurredAt,
      sha256: digest,
      tenantId: command.tenantId
    });
  }

  async restoreBackup(
    command: ControlPlaneRecoveryCommand & { readonly backupId: string }
  ): Promise<ControlPlaneResult<ControlPlaneRestoreReceipt>> {
    const backup = this.ownedBackup(command.backupId, command.tenantId);
    if (backup === undefined) {
      return failure(ControlPlaneOperationStatus.NotFound, ControlPlaneErrorCode.BackupNotFound);
    }
    const digest = await this.#fingerprint.fingerprint(
      backupPayload(command.tenantId, backup.documents, backup.effects)
    );
    if (digest !== backup.digest) {
      return failure(
        ControlPlaneOperationStatus.Failed,
        ControlPlaneErrorCode.BackupIntegrityFailed
      );
    }
    return this.applyRestore(command, backup);
  }

  private async applyRestore(
    command: ControlPlaneRecoveryCommand & { readonly backupId: string },
    backup: TenantBackup
  ): Promise<ControlPlaneResult<ControlPlaneRestoreReceipt>> {
    const state = this.state(command.tenantId);
    state.documents = structuredClone(backup.documents);
    state.effects = structuredClone(backup.effects);
    this.publish(
      state,
      command.tenantId,
      command.correlationId,
      command.occurredAt,
      {
        backupId: command.backupId
      },
      ControlPlaneRealtimeMessageType.TenantRestored
    );
    this.recordAudit(
      recoveryAudit(command, ControlPlaneAuditAction.BackupRestored, command.backupId)
    );
    return succeeded({
      backupId: command.backupId,
      restoredAt: command.occurredAt,
      tenantId: command.tenantId
    });
  }

  auditEntries(tenantId: string): readonly ControlPlaneAuditEntry[] {
    return structuredClone(this.state(tenantId).audits);
  }

  realtimeMessages(tenantId: string): readonly ControlPlaneRealtimeMessage[] {
    return this.state(tenantId).outbox.messages();
  }

  private ownedBackup(backupId: string, tenantId: string): TenantBackup | undefined {
    const backup = this.#backups.get(backupId);
    if (backup === undefined) return undefined;
    if (backup.tenantId !== tenantId) return undefined;
    return backup;
  }

  private async finishEffect(
    command: ControlPlaneCompleteEffectCommand | ControlPlaneFailEffectCommand,
    result: ControlPlaneResult<ControlPlaneEffectExecution>,
    outcome: ControlPlaneAuditOutcome
  ): Promise<void> {
    const state = this.state(command.tenantId);
    const stored = state.effects.get(command.idempotencyKey);
    if (stored === undefined) throw new Error("Effect completion has no acquired lease.");
    stored.pending = false;
    stored.result = structuredClone(result);
    this.publish(
      state,
      command.tenantId,
      command.correlationId,
      command.completedAt,
      {
        effectId: command.effectId,
        objectId: command.objectId,
        status: result.status
      },
      ControlPlaneRealtimeMessageType.EffectCompleted
    );
    this.recordAudit(effectAudit(command, outcome));
  }

  private recordAudit(entry: ControlPlaneAuditEntry): void {
    this.state(entry.tenantId).audits.push(structuredClone(entry));
  }

  private publish(
    state: TenantState,
    tenantId: string,
    correlationId: string,
    occurredAt: string,
    payload: JsonObject,
    type: ControlPlaneRealtimeMessageType
  ): void {
    state.outbox.publish({
      correlationId,
      occurredAt,
      payload,
      tenantId,
      type
    });
  }

  private state(tenantId: string): TenantState {
    const current = this.#tenants.get(tenantId);
    if (current !== undefined) return current;
    const created: TenantState = {
      audits: [],
      documents: new Map(),
      effects: new Map(),
      nextRevision: 1,
      outbox: new ReferenceControlPlaneOutbox(this.#retention)
    };
    this.#tenants.set(tenantId, created);
    return created;
  }

  private nextRevision(state: TenantState): string {
    return `revision-${state.nextRevision++}`;
  }
}

function existingLease(stored: StoredEffect, fingerprint: string): ControlPlaneEffectLease {
  if (stored.fingerprint !== fingerprint) return { status: ControlPlaneEffectLeaseStatus.Conflict };
  return matchingLease(stored);
}

function matchingLease(stored: StoredEffect): ControlPlaneEffectLease {
  if (stored.pending) return { status: ControlPlaneEffectLeaseStatus.InProgress };
  if (stored.result === undefined) throw new Error("Completed effect lease has no result.");
  return { result: stored.result, status: ControlPlaneEffectLeaseStatus.Replay };
}
