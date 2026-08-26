import type { ControlPlaneCommitCommand } from "./ports.js";
import {
  ControlPlaneAuditOutcome,
  ControlPlaneErrorCode,
  ControlPlaneOperationStatus,
  ControlPlaneRealtimeMessageType,
  type ControlPlaneAuditEntry,
  type ControlPlaneDocumentRevision,
  type ControlPlaneResult
} from "./types.js";
import {
  commitAudit,
  currentRevision,
  failure,
  matchesExpectedRevision,
  quotaExceeded,
  revisionRecord,
  succeeded
} from "./reference-store-helpers.js";
import { publishSqliteOutbox } from "./sqlite-outbox.js";
import {
  appendSqliteAudit,
  ensureSqliteTenant,
  nextSqliteCounter,
  parseSqliteJson,
  sqliteJson,
  type SqliteStoreContext
} from "./sqlite-store-helpers.js";
import { controlPlaneSqliteTransaction } from "./sqlite-transaction.js";

export function commitSqliteDocument(
  context: SqliteStoreContext,
  command: ControlPlaneCommitCommand
): ControlPlaneResult<ControlPlaneDocumentRevision> {
  return controlPlaneSqliteTransaction(context.database, () => commitTransaction(context, command));
}

export function readSqliteDocument(
  context: SqliteStoreContext,
  tenantId: string,
  objectId: string
): ControlPlaneDocumentRevision | undefined {
  const row = context.database
    .prepare(
      "SELECT revision_json FROM unifold_control_plane_document " +
        "WHERE tenant_id = ? AND object_id = ?"
    )
    .get(tenantId, objectId) as { readonly revision_json: unknown } | undefined;
  return row === undefined ? undefined : parseSqliteJson(row.revision_json);
}

export function appendSqliteAuditEntry(
  context: SqliteStoreContext,
  entry: ControlPlaneAuditEntry
): void {
  controlPlaneSqliteTransaction(context.database, () => appendSqliteAudit(context.database, entry));
}

export function sqliteAuditEntries(
  context: SqliteStoreContext,
  tenantId: string
): readonly ControlPlaneAuditEntry[] {
  const rows = context.database
    .prepare(
      "SELECT entry_json FROM unifold_control_plane_audit WHERE tenant_id = ? ORDER BY audit_id"
    )
    .all(tenantId) as unknown as readonly { readonly entry_json: unknown }[];
  return rows.map(({ entry_json }) => parseSqliteJson(entry_json));
}

function commitTransaction(
  context: SqliteStoreContext,
  command: ControlPlaneCommitCommand
): ControlPlaneResult<ControlPlaneDocumentRevision> {
  ensureSqliteTenant(context.database, command.tenantId);
  const current = readSqliteDocument(context, command.tenantId, command.objectId);
  if (!matchesExpectedRevision(current, command.expectedRevision)) {
    appendSqliteAudit(context.database, commitAudit(command, ControlPlaneAuditOutcome.Failed));
    return failure(ControlPlaneOperationStatus.Conflict, ControlPlaneErrorCode.DocumentConflict);
  }
  if (documentQuotaExceeded(context, command, current)) {
    appendSqliteAudit(context.database, commitAudit(command, ControlPlaneAuditOutcome.Denied));
    return failure(ControlPlaneOperationStatus.Denied, ControlPlaneErrorCode.TenantQuotaExceeded);
  }
  return commitAcceptedDocument(context, command, current);
}

function commitAcceptedDocument(
  context: SqliteStoreContext,
  command: ControlPlaneCommitCommand,
  current: ControlPlaneDocumentRevision | undefined
): ControlPlaneResult<ControlPlaneDocumentRevision> {
  const revision = `revision-${nextSqliteCounter(context.database, command.tenantId, "next_revision")}`;
  const record = revisionRecord(command, revision, currentRevision(current));
  context.database
    .prepare(
      "INSERT INTO unifold_control_plane_document(tenant_id, object_id, revision_json) VALUES (?, ?, ?) " +
        "ON CONFLICT(tenant_id, object_id) DO UPDATE SET revision_json = excluded.revision_json"
    )
    .run(command.tenantId, command.objectId, sqliteJson(record));
  publishCommit(context, command, revision);
  appendSqliteAudit(
    context.database,
    commitAudit(command, ControlPlaneAuditOutcome.Succeeded, revision)
  );
  return succeeded(record);
}

function publishCommit(
  context: SqliteStoreContext,
  command: ControlPlaneCommitCommand,
  revision: string
): void {
  publishSqliteOutbox(context, {
    correlationId: command.correlationId,
    occurredAt: command.occurredAt,
    payload: { objectId: command.objectId, revision },
    tenantId: command.tenantId,
    type: ControlPlaneRealtimeMessageType.DocumentCommitted
  });
}

function documentQuotaExceeded(
  context: SqliteStoreContext,
  command: ControlPlaneCommitCommand,
  current: ControlPlaneDocumentRevision | undefined
): boolean {
  const row = context.database
    .prepare("SELECT count(*) AS count FROM unifold_control_plane_document WHERE tenant_id = ?")
    .get(command.tenantId) as { readonly count: number };
  return quotaExceeded(current, row.count, context.maxDocuments);
}
