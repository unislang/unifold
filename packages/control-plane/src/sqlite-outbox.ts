import type { JsonObject } from "@unislang/unifold-contracts";

import type {
  ControlPlaneOutboxAcknowledgeCommand,
  ControlPlaneOutboxEntry,
  ControlPlaneOutboxLeaseCommand,
  ControlPlaneOutboxReleaseCommand
} from "./ports.js";
import {
  ControlPlaneErrorCode,
  ControlPlaneOperationStatus,
  type ControlPlaneRealtimeBatch,
  type ControlPlaneRealtimeMessage,
  type ControlPlaneRealtimeMessageType,
  type ControlPlaneResult
} from "./types.js";
import { failure, oldestAvailableSequence, succeeded } from "./reference-store-helpers.js";
import {
  requireOutboxAcknowledgeCommand,
  requireOutboxLeaseCommand,
  requireOutboxReleaseCommand
} from "./outbox-policy.js";
import {
  ensureSqliteTenant,
  nextSqliteCounter,
  parseSqliteJson,
  sqliteJson,
  sqliteNumber,
  type SqliteStoreContext
} from "./sqlite-store-helpers.js";
import { controlPlaneSqliteTransaction } from "./sqlite-transaction.js";

interface SqliteOutboxMessage {
  readonly correlationId: string;
  readonly occurredAt: string;
  readonly payload: JsonObject;
  readonly tenantId: string;
  readonly type: ControlPlaneRealtimeMessageType;
}

interface OutboxRow {
  readonly attempts: unknown;
  readonly message_json: unknown;
  readonly sequence: unknown;
}

export function publishSqliteOutbox(
  context: SqliteStoreContext,
  value: SqliteOutboxMessage
): ControlPlaneRealtimeMessage {
  const sequence = nextSqliteCounter(context.database, value.tenantId, "next_sequence");
  const message: ControlPlaneRealtimeMessage = Object.freeze({
    ...structuredClone(value),
    sequence
  });
  insertRealtime(context, message);
  context.database
    .prepare(
      "INSERT INTO unifold_control_plane_outbox" +
        "(tenant_id, sequence, message_json, available_at) VALUES (?, ?, ?, ?)"
    )
    .run(value.tenantId, sequence, sqliteJson(message), value.occurredAt);
  return message;
}

export function resumeSqliteRealtime(
  context: SqliteStoreContext,
  tenantId: string,
  afterSequence: number
): ControlPlaneResult<ControlPlaneRealtimeBatch> {
  ensureSqliteTenant(context.database, tenantId);
  const messages = realtimeRows(context, tenantId, afterSequence);
  const counters = tenantCounters(context, tenantId);
  const oldest = oldestAvailableSequence(messages[0]?.sequence, counters.nextSequence);
  if (realtimeGap(messages.length, afterSequence, oldest)) {
    return failure(ControlPlaneOperationStatus.Gap, ControlPlaneErrorCode.RealtimeGap);
  }
  return succeeded({
    latestSequence: counters.nextSequence - 1,
    messages,
    oldestAvailableSequence: oldest
  });
}

export function leaseSqliteOutbox(
  context: SqliteStoreContext,
  command: ControlPlaneOutboxLeaseCommand
): readonly ControlPlaneOutboxEntry[] {
  requireOutboxLeaseCommand(command);
  return controlPlaneSqliteTransaction(context.database, () => acquireAvailable(context, command));
}

export function acknowledgeSqliteOutbox(
  context: SqliteStoreContext,
  command: ControlPlaneOutboxAcknowledgeCommand
): number {
  requireOutboxAcknowledgeCommand(command);
  return controlPlaneSqliteTransaction(context.database, () =>
    command.sequences.reduce(
      (count, sequence) => count + acknowledgeOne(context, command, sequence),
      0
    )
  );
}

export function releaseSqliteOutbox(
  context: SqliteStoreContext,
  command: ControlPlaneOutboxReleaseCommand
): number {
  requireOutboxReleaseCommand(command);
  return controlPlaneSqliteTransaction(context.database, () =>
    command.sequences.reduce((count, sequence) => count + releaseOne(context, command, sequence), 0)
  );
}

export function sqliteRealtimeMessages(
  context: SqliteStoreContext,
  tenantId: string
): readonly ControlPlaneRealtimeMessage[] {
  return realtimeRows(context, tenantId, 0);
}

function insertRealtime(context: SqliteStoreContext, message: ControlPlaneRealtimeMessage): void {
  context.database
    .prepare(
      "INSERT INTO unifold_control_plane_realtime(tenant_id, sequence, message_json) VALUES (?, ?, ?)"
    )
    .run(message.tenantId, message.sequence, sqliteJson(message));
  const threshold = message.sequence - context.realtimeRetention;
  context.database
    .prepare("DELETE FROM unifold_control_plane_realtime WHERE tenant_id = ? AND sequence <= ?")
    .run(message.tenantId, threshold);
}

function realtimeRows(
  context: SqliteStoreContext,
  tenantId: string,
  afterSequence: number
): ControlPlaneRealtimeMessage[] {
  const rows = context.database
    .prepare(
      "SELECT message_json FROM unifold_control_plane_realtime " +
        "WHERE tenant_id = ? AND sequence > ? ORDER BY sequence"
    )
    .all(tenantId, afterSequence) as unknown as readonly { readonly message_json: unknown }[];
  return rows.map(({ message_json }) => parseSqliteJson<ControlPlaneRealtimeMessage>(message_json));
}

function tenantCounters(context: SqliteStoreContext, tenantId: string) {
  return context.database
    .prepare(
      "SELECT next_revision AS nextRevision, next_sequence AS nextSequence " +
        "FROM unifold_control_plane_tenant WHERE tenant_id = ?"
    )
    .get(tenantId) as { readonly nextRevision: number; readonly nextSequence: number };
}

function acquireAvailable(
  context: SqliteStoreContext,
  command: ControlPlaneOutboxLeaseCommand
): readonly ControlPlaneOutboxEntry[] {
  const rows = availableRows(context, command);
  return rows.map((row) => acquireRow(context, command, row));
}

function availableRows(
  context: SqliteStoreContext,
  command: ControlPlaneOutboxLeaseCommand
): readonly OutboxRow[] {
  return context.database
    .prepare(
      "SELECT sequence, attempts, message_json FROM unifold_control_plane_outbox " +
        "WHERE tenant_id = ? AND available_at <= ? AND (lease_until IS NULL OR lease_until <= ?) " +
        "ORDER BY sequence LIMIT ?"
    )
    .all(
      command.tenantId,
      command.leasedAt,
      command.leasedAt,
      boundedLimit(command.limit)
    ) as unknown as OutboxRow[];
}

function acquireRow(
  context: SqliteStoreContext,
  command: ControlPlaneOutboxLeaseCommand,
  row: OutboxRow
): ControlPlaneOutboxEntry {
  const sequence = sqliteNumber(row.sequence, "sequence");
  const attempts = sqliteNumber(row.attempts, "attempts") + 1;
  context.database
    .prepare(
      "UPDATE unifold_control_plane_outbox SET attempts = ?, lease_owner = ?, lease_until = ? " +
        "WHERE tenant_id = ? AND sequence = ?"
    )
    .run(attempts, command.workerId, command.leaseUntil, command.tenantId, sequence);
  return Object.freeze({
    attempts,
    message: parseSqliteJson<ControlPlaneRealtimeMessage>(row.message_json)
  });
}

function acknowledgeOne(
  context: SqliteStoreContext,
  command: ControlPlaneOutboxAcknowledgeCommand,
  sequence: number
): number {
  const result = context.database
    .prepare(
      "DELETE FROM unifold_control_plane_outbox " +
        "WHERE tenant_id = ? AND sequence = ? AND lease_owner = ? AND lease_until >= ?"
    )
    .run(command.tenantId, sequence, command.workerId, command.acknowledgedAt);
  return Number(result.changes);
}

function releaseOne(
  context: SqliteStoreContext,
  command: ControlPlaneOutboxReleaseCommand,
  sequence: number
): number {
  const result = context.database
    .prepare(
      "UPDATE unifold_control_plane_outbox " +
        "SET available_at = ?, lease_owner = NULL, lease_until = NULL " +
        "WHERE tenant_id = ? AND sequence = ? AND lease_owner = ?"
    )
    .run(command.availableAt, command.tenantId, sequence, command.workerId);
  return Number(result.changes);
}

function boundedLimit(limit: number): number {
  return Math.max(0, Math.min(100, Math.trunc(limit)));
}

function realtimeGap(messageCount: number, afterSequence: number, oldest: number): boolean {
  return [messageCount > 0, afterSequence < oldest - 1].every(Boolean);
}
