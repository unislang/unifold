import { DatabaseSync } from "node:sqlite";
import { afterEach, expect, it } from "vitest";

import { SqliteControlPlaneRecoverySource } from "./sqlite-recovery-source.js";
import { SqliteControlPlaneStore } from "./sqlite-store.js";
import type { ControlPlaneCommitCommand } from "./ports.js";
import { ControlPlaneOperationStatus } from "./types.js";

const databases: DatabaseSync[] = [];

afterEach(() => databases.splice(0).forEach((database) => database.close()));

it("exports tenant state and proves exact restoration in a scratch SQLite database", async () => {
  const database = openedDatabase();
  const store = new SqliteControlPlaneStore({ database });
  await expect(store.commitDocument(commitCommand())).resolves.toMatchObject({
    status: ControlPlaneOperationStatus.Succeeded
  });
  const source = new SqliteControlPlaneRecoverySource({ database });
  const snapshot = await source.exportTenant("tenant-1");
  await expect(source.verifyRestore("tenant-1", snapshot)).resolves.toBeUndefined();

  const documents = snapshot["documents"] as readonly Record<string, unknown>[];
  const corrupted = {
    ...snapshot,
    documents: [
      {
        ...documents[0],
        revision: { ...(documents[0]?.["revision"] as object), tenantId: "tenant-2" }
      }
    ]
  };
  await expect(source.verifyRestore("tenant-1", corrupted)).rejects.toThrow(
    "Recovery document identity mismatch"
  );
});

function openedDatabase(): DatabaseSync {
  const database = new DatabaseSync(":memory:");
  databases.push(database);
  return database;
}

function commitCommand(): ControlPlaneCommitCommand {
  return {
    actorId: "actor-1",
    correlationId: "correlation-1",
    document: { kind: "Page" },
    objectId: "document-1",
    occurredAt: "2026-08-26T00:00:00.000Z",
    requestId: "request-1",
    tenantId: "tenant-1"
  };
}
