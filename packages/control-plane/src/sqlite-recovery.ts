import type { JsonObject, JsonValue } from "@unislang/unifold-contracts";

import type { ControlPlaneRecoveryCommand } from "./ports.js";
import {
  ControlPlaneAuditAction,
  ControlPlaneErrorCode,
  ControlPlaneOperationStatus,
  ControlPlaneRealtimeMessageType,
  type ControlPlaneBackupReceipt,
  type ControlPlaneRestoreReceipt,
  type ControlPlaneResult
} from "./types.js";
import { failure, recoveryAudit, succeeded } from "./reference-store-helpers.js";
import { publishSqliteOutbox } from "./sqlite-outbox.js";
import {
  appendSqliteAudit,
  ensureSqliteTenant,
  parseSqliteJson,
  sqliteJson,
  sqliteText,
  type SqliteStoreContext
} from "./sqlite-store-helpers.js";
import { controlPlaneSqliteTransaction } from "./sqlite-transaction.js";

interface BackupSnapshot extends JsonObject {
  readonly documents: readonly JsonObject[];
  readonly idempotency: readonly JsonObject[];
  readonly tenantId: string;
}

interface BackupRow {
  readonly digest: unknown;
  readonly documents_json: unknown;
  readonly effects_json: unknown;
}

export async function createSqliteBackup(
  context: SqliteStoreContext,
  command: ControlPlaneRecoveryCommand
): Promise<ControlPlaneResult<ControlPlaneBackupReceipt>> {
  const snapshot = controlPlaneSqliteTransaction(context.database, () =>
    backupSnapshot(context, command.tenantId)
  );
  const digest = await context.fingerprint.fingerprint(snapshot);
  return controlPlaneSqliteTransaction(context.database, () =>
    persistBackup(context, command, snapshot, digest)
  );
}

export async function restoreSqliteBackup(
  context: SqliteStoreContext,
  command: ControlPlaneRecoveryCommand & { readonly backupId: string }
): Promise<ControlPlaneResult<ControlPlaneRestoreReceipt>> {
  const row = ownedBackup(context, command.backupId, command.tenantId);
  if (row === undefined) {
    return failure(ControlPlaneOperationStatus.NotFound, ControlPlaneErrorCode.BackupNotFound);
  }
  const snapshot = decodedBackup(command.tenantId, row);
  const digest = await context.fingerprint.fingerprint(snapshot);
  if (digest !== row.digest) {
    return failure(ControlPlaneOperationStatus.Failed, ControlPlaneErrorCode.BackupIntegrityFailed);
  }
  return controlPlaneSqliteTransaction(context.database, () =>
    applyBackup(context, command, snapshot)
  );
}

function backupSnapshot(context: SqliteStoreContext, tenantId: string): BackupSnapshot {
  ensureSqliteTenant(context.database, tenantId);
  return {
    documents: documentRows(context, tenantId),
    idempotency: effectRows(context, tenantId),
    tenantId
  };
}

function documentRows(context: SqliteStoreContext, tenantId: string): JsonObject[] {
  const rows = context.database
    .prepare(
      "SELECT revision_json AS value FROM unifold_control_plane_document " +
        "WHERE tenant_id = ? ORDER BY object_id"
    )
    .all(tenantId) as unknown as readonly { readonly value: unknown }[];
  return rows.map(({ value }) => backupDocument(parseSqliteJson(value)));
}

function backupDocument(revision: JsonObject): JsonObject {
  return { objectId: revision["objectId"], revision };
}

function effectRows(context: SqliteStoreContext, tenantId: string): JsonObject[] {
  const rows = context.database
    .prepare(
      "SELECT idempotency_key, fingerprint, pending, result_json " +
        "FROM unifold_control_plane_effect WHERE tenant_id = ? ORDER BY idempotency_key"
    )
    .all(tenantId) as readonly Record<string, unknown>[];
  return rows.map((row) => ({
    fingerprint: sqliteText(row["fingerprint"], "fingerprint"),
    idempotencyKey: sqliteText(row["idempotency_key"], "idempotency_key"),
    pending: row["pending"] === 1,
    result: row["result_json"] === null ? null : parseSqliteJson<JsonValue>(row["result_json"])
  }));
}

function persistBackup(
  context: SqliteStoreContext,
  command: ControlPlaneRecoveryCommand,
  snapshot: BackupSnapshot,
  digest: string
): ControlPlaneResult<ControlPlaneBackupReceipt> {
  const backupId = nextBackupId(context);
  context.database
    .prepare(
      "INSERT INTO unifold_control_plane_backup" +
        "(backup_id, tenant_id, digest, documents_json, effects_json) VALUES (?, ?, ?, ?, ?)"
    )
    .run(
      backupId,
      command.tenantId,
      digest,
      sqliteJson(snapshot.documents),
      sqliteJson(snapshot.idempotency)
    );
  appendSqliteAudit(
    context.database,
    recoveryAudit(command, ControlPlaneAuditAction.BackupCreated, backupId)
  );
  return succeeded({
    backupId,
    createdAt: command.occurredAt,
    sha256: digest,
    tenantId: command.tenantId
  });
}

function nextBackupId(context: SqliteStoreContext): string {
  const row = context.database
    .prepare("SELECT count(*) AS count FROM unifold_control_plane_backup")
    .get() as { readonly count: number };
  return `backup-${row.count + 1}`;
}

function ownedBackup(
  context: SqliteStoreContext,
  backupId: string,
  tenantId: string
): BackupRow | undefined {
  return context.database
    .prepare(
      "SELECT digest, documents_json, effects_json FROM unifold_control_plane_backup " +
        "WHERE backup_id = ? AND tenant_id = ?"
    )
    .get(backupId, tenantId) as BackupRow | undefined;
}

function decodedBackup(tenantId: string, row: BackupRow): BackupSnapshot {
  return {
    documents: parseSqliteJson(row.documents_json),
    idempotency: parseSqliteJson(row.effects_json),
    tenantId
  };
}

function applyBackup(
  context: SqliteStoreContext,
  command: ControlPlaneRecoveryCommand & { readonly backupId: string },
  snapshot: BackupSnapshot
): ControlPlaneResult<ControlPlaneRestoreReceipt> {
  replaceTenantRows(context, command.tenantId, snapshot);
  publishSqliteOutbox(context, {
    correlationId: command.correlationId,
    occurredAt: command.occurredAt,
    payload: { backupId: command.backupId },
    tenantId: command.tenantId,
    type: ControlPlaneRealtimeMessageType.TenantRestored
  });
  appendSqliteAudit(
    context.database,
    recoveryAudit(command, ControlPlaneAuditAction.BackupRestored, command.backupId)
  );
  return succeeded({
    backupId: command.backupId,
    restoredAt: command.occurredAt,
    tenantId: command.tenantId
  });
}

function replaceTenantRows(
  context: SqliteStoreContext,
  tenantId: string,
  snapshot: BackupSnapshot
): void {
  context.database
    .prepare("DELETE FROM unifold_control_plane_document WHERE tenant_id = ?")
    .run(tenantId);
  context.database
    .prepare("DELETE FROM unifold_control_plane_effect WHERE tenant_id = ?")
    .run(tenantId);
  snapshot.documents.forEach((record) => insertDocument(context, tenantId, record));
  snapshot.idempotency.forEach((record) => insertEffect(context, tenantId, record));
}

function insertDocument(context: SqliteStoreContext, tenantId: string, record: JsonObject): void {
  const objectId = sqliteText(record["objectId"], "objectId");
  const revision = requireJsonObject(record["revision"], "revision");
  context.database
    .prepare(
      "INSERT INTO unifold_control_plane_document(tenant_id, object_id, revision_json) VALUES (?, ?, ?)"
    )
    .run(tenantId, objectId, sqliteJson(revision));
}

function insertEffect(context: SqliteStoreContext, tenantId: string, record: JsonObject): void {
  context.database
    .prepare(
      "INSERT INTO unifold_control_plane_effect" +
        "(tenant_id, idempotency_key, fingerprint, pending, result_json) VALUES (?, ?, ?, ?, ?)"
    )
    .run(
      tenantId,
      sqliteText(record["idempotencyKey"], "idempotencyKey"),
      sqliteText(record["fingerprint"], "fingerprint"),
      record["pending"] === true ? 1 : 0,
      record["result"] === null ? null : sqliteJson(record["result"])
    );
}

function requireJsonObject(value: JsonValue | undefined, column: string): JsonObject {
  if (!isJsonObject(value)) throw new Error(`SQLite backup ${column} is not an object.`);
  return value;
}

function isJsonObject(value: JsonValue | undefined): value is JsonObject {
  if (typeof value !== "object") return false;
  if (value === null) return false;
  return !Array.isArray(value);
}
