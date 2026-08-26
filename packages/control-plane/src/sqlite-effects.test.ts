import { DatabaseSync } from "node:sqlite";
import { expect, it } from "vitest";

import { controlPlaneFingerprint } from "./fingerprint.js";
import { beginSqliteEffect, completeSqliteEffect } from "./sqlite-effects.js";
import { initializeControlPlaneSqlite } from "./sqlite-schema.js";
import type { SqliteStoreContext } from "./sqlite-store-helpers.js";
import { ControlPlaneEffectLeaseStatus, ControlPlaneProtocolVersion } from "./types.js";

it("reserves one idempotency lease and durably replays its atomic completion", () => {
  const context = sqliteContext();
  expect(beginSqliteEffect(context, lease).status).toBe(ControlPlaneEffectLeaseStatus.Acquired);
  expect(beginSqliteEffect(context, lease).status).toBe(ControlPlaneEffectLeaseStatus.InProgress);
  expect(requireValue(completeSqliteEffect(context, completion).value).output).toEqual({
    receipt: "receipt-1"
  });
  const replay = beginSqliteEffect(context, lease);
  expect(replay.status).toBe(ControlPlaneEffectLeaseStatus.Replay);
  expect(requireValue(requireValue(replay.result).value).output).toEqual({ receipt: "receipt-1" });
  expect(beginSqliteEffect(context, { ...lease, fingerprint: "different" }).status).toBe(
    ControlPlaneEffectLeaseStatus.Conflict
  );
});

it("rolls effect completion back to the acquired lease when outbox publication fails", () => {
  const context = sqliteContext();
  expect(beginSqliteEffect(context, lease).status).toBe(ControlPlaneEffectLeaseStatus.Acquired);
  context.database.exec(`
    CREATE TRIGGER reject_effect_outbox BEFORE INSERT ON unifold_control_plane_outbox
    BEGIN SELECT RAISE(ABORT, 'injected effect outbox failure'); END
  `);
  expect(() => completeSqliteEffect(context, completion)).toThrow("injected effect outbox failure");
  expect(beginSqliteEffect(context, lease).status).toBe(ControlPlaneEffectLeaseStatus.InProgress);
  const row = context.database
    .prepare("SELECT pending, result_json FROM unifold_control_plane_effect")
    .get();
  expect(row).toEqual({ pending: 1, result_json: null });
});

const lease = {
  effectId: "orders.submit",
  fingerprint: "fingerprint-1",
  idempotencyKey: "effect-1",
  objectId: "document-1",
  tenantId: "tenant-a"
};

const completion = {
  ...lease,
  actorId: "actor-1",
  completedAt: "2026-01-01T00:00:00.000Z",
  correlationId: "correlation-1",
  output: { receipt: "receipt-1" },
  protocolVersion: ControlPlaneProtocolVersion.Version1,
  requestId: "request-1"
};

function sqliteContext(): SqliteStoreContext {
  const database = new DatabaseSync(":memory:");
  initializeControlPlaneSqlite(database);
  return {
    database,
    fingerprint: controlPlaneFingerprint,
    maxDocuments: 10,
    realtimeRetention: 10
  };
}

function requireValue<TValue>(value: TValue | undefined): TValue {
  if (value === undefined) throw new Error("Expected a SQLite effect value.");
  return value;
}
