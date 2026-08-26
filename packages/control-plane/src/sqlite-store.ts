import type { DatabaseSync } from "node:sqlite";

import type {
  ControlPlaneCommitCommand,
  ControlPlaneCompleteEffectCommand,
  ControlPlaneDurableStorePort,
  ControlPlaneEffectLease,
  ControlPlaneEffectLeaseCommand,
  ControlPlaneFailEffectCommand,
  ControlPlaneFingerprintPort,
  ControlPlaneOutboxAcknowledgeCommand,
  ControlPlaneOutboxEntry,
  ControlPlaneOutboxLeaseCommand,
  ControlPlaneOutboxReleaseCommand,
  ControlPlaneRecoveryCommand
} from "./ports.js";
import {
  type ControlPlaneAuditEntry,
  type ControlPlaneBackupReceipt,
  type ControlPlaneDocumentRevision,
  type ControlPlaneEffectExecution,
  type ControlPlaneRealtimeBatch,
  type ControlPlaneRealtimeMessage,
  type ControlPlaneRestoreReceipt,
  type ControlPlaneResult
} from "./types.js";
import { configuredFingerprint, configuredLimit } from "./reference-store-helpers.js";
import {
  appendSqliteAuditEntry,
  commitSqliteDocument,
  readSqliteDocument,
  sqliteAuditEntries
} from "./sqlite-documents.js";
import { beginSqliteEffect, completeSqliteEffect, failSqliteEffect } from "./sqlite-effects.js";
import {
  acknowledgeSqliteOutbox,
  leaseSqliteOutbox,
  releaseSqliteOutbox,
  resumeSqliteRealtime,
  sqliteRealtimeMessages
} from "./sqlite-outbox.js";
import { createSqliteBackup, restoreSqliteBackup } from "./sqlite-recovery.js";
import { initializeControlPlaneSqlite } from "./sqlite-schema.js";
import type { SqliteStoreContext } from "./sqlite-store-helpers.js";

export interface SqliteControlPlaneStoreOptions {
  readonly database: DatabaseSync;
  readonly fingerprint?: ControlPlaneFingerprintPort | undefined;
  readonly maxDocumentsPerTenant?: number | undefined;
  readonly realtimeRetention?: number | undefined;
}

export class SqliteControlPlaneStore implements ControlPlaneDurableStorePort {
  readonly #context: SqliteStoreContext;

  constructor(options: SqliteControlPlaneStoreOptions) {
    initializeControlPlaneSqlite(options.database);
    this.#context = {
      database: options.database,
      fingerprint: configuredFingerprint(options.fingerprint),
      maxDocuments: configuredLimit(options.maxDocumentsPerTenant, 1000),
      realtimeRetention: configuredLimit(options.realtimeRetention, 1000)
    };
  }

  async appendAudit(entry: ControlPlaneAuditEntry): Promise<void> {
    appendSqliteAuditEntry(this.#context, entry);
  }

  async beginEffect(command: ControlPlaneEffectLeaseCommand): Promise<ControlPlaneEffectLease> {
    return beginSqliteEffect(this.#context, command);
  }

  async commitDocument(
    command: ControlPlaneCommitCommand
  ): Promise<ControlPlaneResult<ControlPlaneDocumentRevision>> {
    return commitSqliteDocument(this.#context, command);
  }

  async completeEffect(
    command: ControlPlaneCompleteEffectCommand
  ): Promise<ControlPlaneResult<ControlPlaneEffectExecution>> {
    return completeSqliteEffect(this.#context, command);
  }

  async createBackup(
    command: ControlPlaneRecoveryCommand
  ): Promise<ControlPlaneResult<ControlPlaneBackupReceipt>> {
    return createSqliteBackup(this.#context, command);
  }

  async failEffect(
    command: ControlPlaneFailEffectCommand
  ): Promise<ControlPlaneResult<ControlPlaneEffectExecution>> {
    return failSqliteEffect(this.#context, command);
  }

  async readDocument(
    tenantId: string,
    objectId: string
  ): Promise<ControlPlaneDocumentRevision | undefined> {
    return readSqliteDocument(this.#context, tenantId, objectId);
  }

  async restoreBackup(
    command: ControlPlaneRecoveryCommand & { readonly backupId: string }
  ): Promise<ControlPlaneResult<ControlPlaneRestoreReceipt>> {
    return restoreSqliteBackup(this.#context, command);
  }

  async resumeRealtime(
    tenantId: string,
    afterSequence: number
  ): Promise<ControlPlaneResult<ControlPlaneRealtimeBatch>> {
    return resumeSqliteRealtime(this.#context, tenantId, afterSequence);
  }

  async leaseOutbox(
    command: ControlPlaneOutboxLeaseCommand
  ): Promise<readonly ControlPlaneOutboxEntry[]> {
    return leaseSqliteOutbox(this.#context, command);
  }

  async acknowledgeOutbox(command: ControlPlaneOutboxAcknowledgeCommand): Promise<number> {
    return acknowledgeSqliteOutbox(this.#context, command);
  }

  async releaseOutbox(command: ControlPlaneOutboxReleaseCommand): Promise<number> {
    return releaseSqliteOutbox(this.#context, command);
  }

  auditEntries(tenantId: string): readonly ControlPlaneAuditEntry[] {
    return sqliteAuditEntries(this.#context, tenantId);
  }

  realtimeMessages(tenantId: string): readonly ControlPlaneRealtimeMessage[] {
    return sqliteRealtimeMessages(this.#context, tenantId);
  }
}
