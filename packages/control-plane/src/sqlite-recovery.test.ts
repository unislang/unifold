import { DatabaseSync } from "node:sqlite";
import { expect, it, vi } from "vitest";

import { commitSqliteDocument, readSqliteDocument } from "./sqlite-documents.js";
import { createSqliteBackup, restoreSqliteBackup } from "./sqlite-recovery.js";
import { initializeControlPlaneSqlite } from "./sqlite-schema.js";
import type { SqliteStoreContext } from "./sqlite-store-helpers.js";
import { ControlPlaneErrorCode, ControlPlaneProtocolVersion } from "./types.js";

it("restores an integrity-verified tenant snapshot and rejects a mismatched digest", async () => {
  const fingerprint = vi.fn().mockResolvedValueOnce("digest-1").mockResolvedValueOnce("digest-1");
  const context = sqliteContext(fingerprint);
  commitSqliteDocument(context, commit("first"));
  const created = await createSqliteBackup(context, recovery("backup"));
  commitSqliteDocument(context, { ...commit("second"), expectedRevision: "revision-1" });
  const backupId = requireValue(created.value).backupId;
  await restoreSqliteBackup(context, { ...recovery("restore"), backupId });
  expect(readSqliteDocument(context, "tenant-a", "document-1")?.document["value"]).toBe("first");
  fingerprint.mockResolvedValueOnce("changed-digest");
  const rejected = await restoreSqliteBackup(context, { ...recovery("rejected"), backupId });
  expect(rejected.error?.code).toBe(ControlPlaneErrorCode.BackupIntegrityFailed);
});

function sqliteContext(fingerprint: ReturnType<typeof vi.fn>): SqliteStoreContext {
  const database = new DatabaseSync(":memory:");
  initializeControlPlaneSqlite(database);
  return { database, fingerprint: { fingerprint }, maxDocuments: 10, realtimeRetention: 10 };
}

function commit(value: string) {
  return {
    actorId: "actor-1",
    correlationId: "correlation-1",
    document: { value },
    objectId: "document-1",
    occurredAt: "2026-01-01T00:00:00.000Z",
    requestId: `request-${value}`,
    tenantId: "tenant-a"
  };
}

function recovery(requestId: string) {
  return {
    actorId: "actor-1",
    correlationId: "correlation-1",
    occurredAt: "2026-01-01T00:00:00.000Z",
    protocolVersion: ControlPlaneProtocolVersion.Version1,
    requestId,
    tenantId: "tenant-a"
  };
}

function requireValue<TValue>(value: TValue | undefined): TValue {
  if (value === undefined) throw new Error("Expected a value.");
  return value;
}
