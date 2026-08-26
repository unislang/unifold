import { DatabaseSync } from "node:sqlite";
import { expect, it } from "vitest";

import { controlPlaneFingerprint } from "./fingerprint.js";
import { ReferenceControlPlaneStore } from "./reference-store.js";
import { createControlPlaneService } from "./service.js";
import { SqliteControlPlaneStore } from "./sqlite-store.js";
import { registerDurableStoreConformance } from "./durable-store-conformance.test-data.js";
import {
  ControlPlaneCapability,
  ControlPlaneDecision,
  ControlPlaneOperation,
  ControlPlaneProtocolVersion,
  type ControlPlaneTrustedSession
} from "./types.js";

it("uses a caller-owned SQLite database and preserves committed state across store instances", async () => {
  const database = new DatabaseSync(":memory:");
  const first = new SqliteControlPlaneStore({ database });
  await first.commitDocument(command);
  const reopened = new SqliteControlPlaneStore({ database });
  expect((await reopened.readDocument("tenant-a", "document-1"))?.revision).toBe("revision-1");
  expect(reopened.realtimeMessages("tenant-a")).toHaveLength(1);
  database.close();
});

it("produces the same portable backup digest as the memory adapter", async () => {
  const database = new DatabaseSync(":memory:");
  const sqlite = new SqliteControlPlaneStore({ database });
  const memory = new ReferenceControlPlaneStore();
  await Promise.all([sqlite.commitDocument(command), memory.commitDocument(command)]);
  await Promise.all([sqlite.beginEffect(effectLease), memory.beginEffect(effectLease)]);
  const [sqliteBackup, memoryBackup] = await Promise.all([
    sqlite.createBackup(recoveryCommand),
    memory.createBackup(recoveryCommand)
  ]);
  expect(sqliteBackup.value?.sha256).toBe(memoryBackup.value?.sha256);
  database.close();
});

it("runs the supported control-plane service over the SQLite store", async () => {
  const database = new DatabaseSync(":memory:");
  const service = sqliteService(database);
  const committed = await service.commitDocument({
    ...requestMetadata(ControlPlaneOperation.DocumentCommit),
    document: { value: "through-service" },
    objectId: "document-1"
  });
  const read = await service.readDocument({
    ...requestMetadata(ControlPlaneOperation.DocumentRead),
    objectId: "document-1"
  });
  expect(read.value?.revision).toBe(committed.value?.revision);
  database.close();
});

const command = {
  actorId: "actor-1",
  correlationId: "correlation-1",
  document: { value: "persisted" },
  objectId: "document-1",
  occurredAt: "2026-01-01T00:00:00.000Z",
  requestId: "request-1",
  tenantId: "tenant-a"
};

const effectLease = {
  effectId: "orders.submit",
  fingerprint: "fingerprint-1",
  idempotencyKey: "effect-1",
  objectId: "document-1",
  tenantId: "tenant-a"
};

const recoveryCommand = {
  actorId: "actor-1",
  correlationId: "correlation-1",
  occurredAt: "2026-01-01T00:00:00.000Z",
  protocolVersion: ControlPlaneProtocolVersion.Version1,
  requestId: "backup-request",
  tenantId: "tenant-a"
};

const session: ControlPlaneTrustedSession = {
  actorId: "actor-1",
  capabilities: [ControlPlaneCapability.DocumentCommit, ControlPlaneCapability.DocumentRead],
  sessionId: "session-1",
  tenantId: "tenant-a"
};

function sqliteService(database: DatabaseSync) {
  return createControlPlaneService({
    authorization: { decide: async () => ControlPlaneDecision.Allow },
    clock: { now: () => "2026-01-01T00:00:00.000Z" },
    effects: { resolve: () => undefined },
    fingerprint: controlPlaneFingerprint,
    identity: { resolve: async () => session },
    store: new SqliteControlPlaneStore({ database })
  });
}

function requestMetadata<TOperation extends ControlPlaneOperation>(operation: TOperation) {
  return {
    correlationId: "correlation-1",
    operation,
    protocolVersion: ControlPlaneProtocolVersion.Version1,
    requestId: `request-${operation}`,
    sessionToken: "opaque-token"
  };
}

registerDurableStoreConformance("SQLite", () => {
  const database = new DatabaseSync(":memory:");
  return {
    close: () => database.close(),
    store: new SqliteControlPlaneStore({ database })
  };
});
