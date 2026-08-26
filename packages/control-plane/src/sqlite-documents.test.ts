import { DatabaseSync } from "node:sqlite";
import { expect, it } from "vitest";

import { controlPlaneFingerprint } from "./fingerprint.js";
import {
  commitSqliteDocument,
  readSqliteDocument,
  sqliteAuditEntries
} from "./sqlite-documents.js";
import { initializeControlPlaneSqlite } from "./sqlite-schema.js";
import type { SqliteStoreContext } from "./sqlite-store-helpers.js";

it("rolls back document, sequence, audit, and outbox when publication fails", () => {
  const context = sqliteContext();
  context.database.exec(`
    CREATE TRIGGER reject_outbox BEFORE INSERT ON unifold_control_plane_outbox
    BEGIN SELECT RAISE(ABORT, 'injected outbox failure'); END
  `);
  expect(() => commitSqliteDocument(context, command)).toThrow("injected outbox failure");
  expect(readSqliteDocument(context, "tenant-a", "document-1")).toBeUndefined();
  expect(sqliteAuditEntries(context, "tenant-a")).toEqual([]);
  expect(tableCount(context, "unifold_control_plane_realtime")).toBe(0);
  expect(tableCount(context, "unifold_control_plane_outbox")).toBe(0);
});

it("commits a server revision, redacted audit, realtime row, and outbox row together", () => {
  const context = sqliteContext();
  expect(requireValue(commitSqliteDocument(context, command).value).revision).toBe("revision-1");
  expect(requireValue(readSqliteDocument(context, "tenant-a", "document-1")).revision).toBe(
    "revision-1"
  );
  expect(requireValue(sqliteAuditEntries(context, "tenant-a")[0]).details).toEqual({
    objectId: "document-1",
    revision: "revision-1"
  });
  expect(tableCount(context, "unifold_control_plane_realtime")).toBe(1);
  expect(tableCount(context, "unifold_control_plane_outbox")).toBe(1);
});

const command = {
  actorId: "actor-1",
  correlationId: "correlation-1",
  document: { secret: "not-in-audit" },
  objectId: "document-1",
  occurredAt: "2026-01-01T00:00:00.000Z",
  requestId: "request-1",
  tenantId: "tenant-a"
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

function tableCount(context: SqliteStoreContext, table: string): number {
  const permitted = new Set(["unifold_control_plane_outbox", "unifold_control_plane_realtime"]);
  if (!permitted.has(table)) throw new Error("Unexpected test table.");
  const row = context.database.prepare(`SELECT count(*) AS count FROM ${table}`).get() as {
    count: number;
  };
  return row.count;
}

function requireValue<TValue>(value: TValue | undefined): TValue {
  if (value === undefined) throw new Error("Expected a SQLite test value.");
  return value;
}
