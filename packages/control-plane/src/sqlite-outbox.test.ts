import { DatabaseSync } from "node:sqlite";
import { expect, it } from "vitest";

import { controlPlaneFingerprint } from "./fingerprint.js";
import {
  acknowledgeSqliteOutbox,
  leaseSqliteOutbox,
  publishSqliteOutbox,
  releaseSqliteOutbox,
  resumeSqliteRealtime
} from "./sqlite-outbox.js";
import { initializeControlPlaneSqlite } from "./sqlite-schema.js";
import type { SqliteStoreContext } from "./sqlite-store-helpers.js";
import { ControlPlaneRealtimeMessageType } from "./types.js";

it("atomically leases, releases, expires, and acknowledges SQLite outbox rows", () => {
  const context = sqliteContext();
  publishSqliteOutbox(context, message());
  expect(resumeSqliteRealtime(context, "tenant-a", 0).value?.messages).toHaveLength(1);
  expect(leaseSqliteOutbox(context, lease("worker-a", "2026-01-01T00:00:00.000Z"))).toHaveLength(1);
  expect(leaseSqliteOutbox(context, lease("worker-b", "2026-01-01T00:00:01.000Z"))).toEqual([]);
  expect(releaseSqliteOutbox(context, release("worker-a"))).toBe(1);
  const retry = leaseSqliteOutbox(context, lease("worker-b", "2026-01-01T00:00:03.000Z"));
  expect(retry[0]?.attempts).toBe(2);
  expect(acknowledgeSqliteOutbox(context, acknowledge("worker-a"))).toBe(0);
  expect(acknowledgeSqliteOutbox(context, acknowledge("worker-b"))).toBe(1);
});

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

function message() {
  return {
    correlationId: "correlation-1",
    occurredAt: "2026-01-01T00:00:00.000Z",
    payload: { objectId: "document-1" },
    tenantId: "tenant-a",
    type: ControlPlaneRealtimeMessageType.DocumentCommitted
  };
}

function lease(workerId: string, leasedAt: string) {
  return {
    leaseUntil: "2026-01-01T00:00:10.000Z",
    leasedAt,
    limit: 10,
    tenantId: "tenant-a",
    workerId
  };
}

function acknowledge(workerId: string) {
  return {
    acknowledgedAt: "2026-01-01T00:00:04.000Z",
    sequences: [1],
    tenantId: "tenant-a",
    workerId
  };
}

function release(workerId: string) {
  return {
    availableAt: "2026-01-01T00:00:02.000Z",
    sequences: [1],
    tenantId: "tenant-a",
    workerId
  };
}
