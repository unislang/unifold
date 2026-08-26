import { expect, it, vi } from "vitest";

import { ReferenceControlPlaneStore } from "./reference-store.js";
import {
  ControlPlaneErrorCode,
  ControlPlaneOperationStatus,
  ControlPlaneProtocolVersion
} from "./types.js";

const command = {
  actorId: "actor-1",
  correlationId: "correlation-1",
  document: { revision: "untrusted" },
  objectId: "document-1",
  occurredAt: "2026-08-25T12:00:00.000Z",
  requestId: "request-1",
  tenantId: "tenant-a"
};

it("commits a revision, realtime message, and redacted audit record together", async () => {
  const store = new ReferenceControlPlaneStore();
  const result = await store.commitDocument(command);
  expect(result.status).toBe(ControlPlaneOperationStatus.Succeeded);
  expect(store.realtimeMessages("tenant-a")).toHaveLength(1);
  const audit = store.auditEntries("tenant-a")[0];
  expect(audit?.details).toEqual({ objectId: "document-1", revision: "revision-1" });
  expect(JSON.stringify(audit)).not.toContain("untrusted");
});

it("rejects stale revisions and tenant quota overflow", async () => {
  const store = new ReferenceControlPlaneStore({ maxDocumentsPerTenant: 1 });
  await store.commitDocument(command);
  const conflict = await store.commitDocument({ ...command, requestId: "request-2" });
  expect(conflict.error?.code).toBe(ControlPlaneErrorCode.DocumentConflict);
  const quota = await store.commitDocument({ ...command, objectId: "document-2" });
  expect(quota.error?.code).toBe(ControlPlaneErrorCode.TenantQuotaExceeded);
});

it("rejects a backup when restore-time integrity no longer matches", async () => {
  const fingerprint = vi
    .fn()
    .mockResolvedValueOnce("created-digest")
    .mockResolvedValueOnce("changed-digest");
  const store = new ReferenceControlPlaneStore({ fingerprint: { fingerprint } });
  await store.commitDocument(command);
  const backup = await store.createBackup(recovery("backup-request"));
  const backupId = requireValue(backup.value).backupId;
  const restored = await store.restoreBackup({ ...recovery("restore-request"), backupId });
  expect(restored.error?.code).toBe(ControlPlaneErrorCode.BackupIntegrityFailed);
});

function recovery(requestId: string) {
  return {
    actorId: "actor-1",
    correlationId: "correlation-1",
    occurredAt: "2026-08-25T12:00:00.000Z",
    protocolVersion: ControlPlaneProtocolVersion.Version1,
    requestId,
    tenantId: "tenant-a"
  };
}

function requireValue<TValue>(value: TValue | undefined): TValue {
  if (value === undefined) throw new Error("Expected backup value.");
  return value;
}
