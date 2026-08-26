import type {
  ControlPlaneCompleteEffectCommand,
  ControlPlaneEffectLease,
  ControlPlaneEffectLeaseCommand,
  ControlPlaneFailEffectCommand
} from "./ports.js";
import {
  ControlPlaneAuditOutcome,
  ControlPlaneEffectLeaseStatus,
  ControlPlaneErrorCode,
  ControlPlaneOperationStatus,
  ControlPlaneRealtimeMessageType,
  type ControlPlaneEffectExecution,
  type ControlPlaneResult
} from "./types.js";
import { effectAudit, failure, succeeded } from "./reference-store-helpers.js";
import { publishSqliteOutbox } from "./sqlite-outbox.js";
import {
  appendSqliteAudit,
  ensureSqliteTenant,
  parseSqliteJson,
  sqliteJson,
  type SqliteStoreContext
} from "./sqlite-store-helpers.js";
import { controlPlaneSqliteTransaction } from "./sqlite-transaction.js";

interface EffectRow {
  readonly fingerprint: unknown;
  readonly pending: unknown;
  readonly result_json: unknown;
}

export function beginSqliteEffect(
  context: SqliteStoreContext,
  command: ControlPlaneEffectLeaseCommand
): ControlPlaneEffectLease {
  return controlPlaneSqliteTransaction(context.database, () => beginTransaction(context, command));
}

export function completeSqliteEffect(
  context: SqliteStoreContext,
  command: ControlPlaneCompleteEffectCommand
): ControlPlaneResult<ControlPlaneEffectExecution> {
  const execution: ControlPlaneEffectExecution = {
    completedAt: command.completedAt,
    effectId: command.effectId,
    idempotencyKey: command.idempotencyKey,
    objectId: command.objectId,
    output: structuredClone(command.output),
    replayed: false,
    tenantId: command.tenantId
  };
  return finishSqliteEffect(
    context,
    command,
    succeeded(execution),
    ControlPlaneAuditOutcome.Succeeded
  );
}

export function failSqliteEffect(
  context: SqliteStoreContext,
  command: ControlPlaneFailEffectCommand
): ControlPlaneResult<ControlPlaneEffectExecution> {
  const result = failure<ControlPlaneEffectExecution>(
    ControlPlaneOperationStatus.Failed,
    ControlPlaneErrorCode.EffectFailed
  );
  return finishSqliteEffect(context, command, result, ControlPlaneAuditOutcome.Failed);
}

function beginTransaction(
  context: SqliteStoreContext,
  command: ControlPlaneEffectLeaseCommand
): ControlPlaneEffectLease {
  ensureSqliteTenant(context.database, command.tenantId);
  const inserted = context.database
    .prepare(
      "INSERT OR IGNORE INTO unifold_control_plane_effect" +
        "(tenant_id, idempotency_key, fingerprint, pending) VALUES (?, ?, ?, 1)"
    )
    .run(command.tenantId, command.idempotencyKey, command.fingerprint);
  if (inserted.changes === 1) return { status: ControlPlaneEffectLeaseStatus.Acquired };
  return existingEffectLease(readEffectRow(context, command), command.fingerprint);
}

function readEffectRow(
  context: SqliteStoreContext,
  command: ControlPlaneEffectLeaseCommand
): EffectRow {
  const row = context.database
    .prepare(
      "SELECT fingerprint, pending, result_json FROM unifold_control_plane_effect " +
        "WHERE tenant_id = ? AND idempotency_key = ?"
    )
    .get(command.tenantId, command.idempotencyKey) as EffectRow | undefined;
  if (row === undefined) throw new Error("SQLite idempotency row disappeared.");
  return row;
}

function existingEffectLease(row: EffectRow, fingerprint: string): ControlPlaneEffectLease {
  if (row.fingerprint !== fingerprint) return { status: ControlPlaneEffectLeaseStatus.Conflict };
  return matchingEffectLease(row);
}

function matchingEffectLease(row: EffectRow): ControlPlaneEffectLease {
  if (row.pending === 1) return { status: ControlPlaneEffectLeaseStatus.InProgress };
  if (row.result_json === null) throw new Error("Completed SQLite effect has no result.");
  return { result: parseSqliteJson(row.result_json), status: ControlPlaneEffectLeaseStatus.Replay };
}

function finishSqliteEffect(
  context: SqliteStoreContext,
  command: ControlPlaneCompleteEffectCommand | ControlPlaneFailEffectCommand,
  result: ControlPlaneResult<ControlPlaneEffectExecution>,
  outcome: ControlPlaneAuditOutcome
): ControlPlaneResult<ControlPlaneEffectExecution> {
  return controlPlaneSqliteTransaction(context.database, () => {
    persistEffectResult(context, command, result);
    publishEffectResult(context, command, result);
    appendSqliteAudit(context.database, effectAudit(command, outcome));
    return result;
  });
}

function persistEffectResult(
  context: SqliteStoreContext,
  command: ControlPlaneCompleteEffectCommand | ControlPlaneFailEffectCommand,
  result: ControlPlaneResult<ControlPlaneEffectExecution>
): void {
  const updated = context.database
    .prepare(
      "UPDATE unifold_control_plane_effect SET pending = 0, result_json = ? " +
        "WHERE tenant_id = ? AND idempotency_key = ? AND fingerprint = ? AND pending = 1"
    )
    .run(sqliteJson(result), command.tenantId, command.idempotencyKey, command.fingerprint);
  if (updated.changes !== 1) throw new Error("Effect completion has no acquired SQLite lease.");
}

function publishEffectResult(
  context: SqliteStoreContext,
  command: ControlPlaneCompleteEffectCommand | ControlPlaneFailEffectCommand,
  result: ControlPlaneResult<ControlPlaneEffectExecution>
): void {
  publishSqliteOutbox(context, {
    correlationId: command.correlationId,
    occurredAt: command.completedAt,
    payload: { effectId: command.effectId, objectId: command.objectId, status: result.status },
    tenantId: command.tenantId,
    type: ControlPlaneRealtimeMessageType.EffectCompleted
  });
}
