import { DatabaseSync } from "node:sqlite";
import { expect, it } from "vitest";

import { initializeControlPlaneSqlite } from "./sqlite-schema.js";
import {
  appendSqliteAudit,
  nextSqliteCounter,
  parseSqliteJson,
  sqliteJson,
  sqliteNumber,
  sqliteText
} from "./sqlite-store-helpers.js";
import { ControlPlaneAuditAction, ControlPlaneAuditOutcome } from "./types.js";

it("allocates tenant counters and stores safe JSON audit values", () => {
  const database = new DatabaseSync(":memory:");
  initializeControlPlaneSqlite(database);
  expect(nextSqliteCounter(database, "tenant-a", "next_sequence")).toBe(1);
  expect(nextSqliteCounter(database, "tenant-a", "next_sequence")).toBe(2);
  appendSqliteAudit(database, auditEntry());
  const row = database.prepare("SELECT entry_json FROM unifold_control_plane_audit").get() as {
    entry_json: string;
  };
  expect(parseSqliteJson(row.entry_json)).toMatchObject({ requestId: "request-1" });
  expect(sqliteJson({ safe: true })).toBe('{"safe":true}');
  expect(sqliteText("value", "test")).toBe("value");
  expect(sqliteNumber(1, "test")).toBe(1);
  database.close();
});

function auditEntry() {
  return {
    action: ControlPlaneAuditAction.DocumentRead,
    actorId: "actor-1",
    correlationId: "correlation-1",
    details: { objectId: "document-1" },
    occurredAt: "2026-01-01T00:00:00.000Z",
    outcome: ControlPlaneAuditOutcome.Succeeded,
    requestId: "request-1",
    tenantId: "tenant-a"
  };
}
