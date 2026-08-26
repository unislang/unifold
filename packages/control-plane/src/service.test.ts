import { expect, it, vi } from "vitest";

import {
  document,
  grant,
  metadata,
  otherSession,
  referenceOptions
} from "./control-plane.test-data.js";
import { createReferenceControlPlane } from "./reference.js";
import {
  ControlPlaneAuditOutcome,
  ControlPlaneCapability,
  ControlPlaneErrorCode,
  ControlPlaneOperation,
  ControlPlaneOperationStatus,
  ControlPlaneRealtimeMessageType
} from "./types.js";

it("derives tenant identity, denies by default, and records safe denial metadata", async () => {
  const reference = createReferenceControlPlane(referenceOptions());
  const result = await reference.service.commitDocument({
    ...metadata(ControlPlaneOperation.DocumentCommit),
    document: document(),
    objectId: "document-1"
  });
  expect(result.error?.code).toBe(ControlPlaneErrorCode.AuthorizationDenied);
  const audit = reference.store.auditEntries("tenant-a")[0];
  expect(audit?.outcome).toBe(ControlPlaneAuditOutcome.Denied);
  expect(JSON.stringify(audit)).not.toContain("token-a");
});

it("rejects an unknown session without trusting request identity", async () => {
  const reference = createReferenceControlPlane(referenceOptions());
  const result = await reference.service.readDocument({
    ...metadata(ControlPlaneOperation.DocumentRead),
    objectId: "document-1",
    sessionToken: "unknown-token"
  });
  expect(result.error?.code).toBe(ControlPlaneErrorCode.SessionInvalid);
  expect(reference.store.auditEntries("tenant-a")).toHaveLength(0);
});

it("commits server revisions and cannot read across tenant keys", async () => {
  const grants = [
    grant(ControlPlaneCapability.DocumentCommit, "document-1"),
    grant(ControlPlaneCapability.DocumentRead, "document-1"),
    grant(ControlPlaneCapability.DocumentRead, "document-1", otherSession)
  ];
  const service = createReferenceControlPlane(referenceOptions({ grants })).service;
  const committed = await service.commitDocument({
    ...metadata(ControlPlaneOperation.DocumentCommit),
    document: document(),
    objectId: "document-1"
  });
  expect(committed.value?.revision).toBe("revision-1");
  expect(committed.value?.document["revision"]).toBe("revision-1");
  const crossTenant = await service.readDocument({
    ...metadata(ControlPlaneOperation.DocumentRead, "request-2"),
    objectId: "document-1",
    sessionToken: "token-b"
  });
  expect(crossTenant.status).toBe(ControlPlaneOperationStatus.NotFound);
});

it("executes an idempotent registered effect exactly once and redacts values from audit", async () => {
  const invoke = vi.fn(async () => ({ receipt: "receipt-1", secretOutput: "private" }));
  const grants = [grant(ControlPlaneCapability.EffectInvoke, "document-1")];
  const reference = createReferenceControlPlane(
    referenceOptions({ effects: { "orders.submit": { invoke } }, grants })
  );
  const request = {
    ...metadata(ControlPlaneOperation.EffectInvoke),
    effectId: "orders.submit",
    idempotencyKey: "effect-key-1",
    input: { secretInput: "sensitive" },
    objectId: "document-1"
  };
  const first = await reference.service.invokeEffect(request);
  const replay = await reference.service.invokeEffect({ ...request, requestId: "request-2" });
  expect(first.value?.replayed).toBe(false);
  expect(replay.value?.replayed).toBe(true);
  expect(invoke).toHaveBeenCalledTimes(1);
  const auditText = JSON.stringify(reference.store.auditEntries("tenant-a"));
  expect(auditText).not.toContain("sensitive");
  expect(auditText).not.toContain("private");
});

it("rejects an idempotency key reused for a different request", async () => {
  const invoke = vi.fn(async () => ({ accepted: true }));
  const reference = effectReference(invoke);
  const request = effectRequest({ order: 1 });
  await reference.service.invokeEffect(request);
  const conflict = await reference.service.invokeEffect({
    ...request,
    input: { order: 2 },
    requestId: "request-2"
  });
  expect(conflict.error?.code).toBe(ControlPlaneErrorCode.IdempotencyConflict);
  expect(invoke).toHaveBeenCalledTimes(1);
});

it("rejects unregistered effect names without treating them as URLs", async () => {
  const grants = [grant(ControlPlaneCapability.EffectInvoke, "document-1")];
  const reference = createReferenceControlPlane(referenceOptions({ grants }));
  const result = await reference.service.invokeEffect({
    ...effectRequest({ order: 1 }),
    effectId: "https://untrusted.example/effect"
  });
  expect(result.error?.code).toBe(ControlPlaneErrorCode.EffectNotRegistered);
  expect(reference.store.auditEntries("tenant-a")).toHaveLength(1);
});

it("returns in-progress instead of concurrently repeating an acquired effect", async () => {
  const pending = deferred<{ accepted: boolean }>();
  const invoke = vi.fn(() => pending.promise);
  const reference = effectReference(invoke);
  const first = reference.service.invokeEffect(effectRequest({ order: 1 }));
  await vi.waitFor(() => expect(invoke).toHaveBeenCalledTimes(1));
  const concurrent = await reference.service.invokeEffect({
    ...effectRequest({ order: 1 }),
    requestId: "request-2"
  });
  expect(concurrent.error?.code).toBe(ControlPlaneErrorCode.EffectInProgress);
  pending.resolve({ accepted: true });
  await expect(first).resolves.toMatchObject({ status: ControlPlaneOperationStatus.Succeeded });
  expect(invoke).toHaveBeenCalledTimes(1);
});

it("replays a safe failure without repeating a possibly completed side effect", async () => {
  const invoke = vi.fn(async () => {
    throw new Error("provider secret");
  });
  const reference = effectReference(invoke);
  const first = await reference.service.invokeEffect(effectRequest({ order: 1 }));
  const replay = await reference.service.invokeEffect({
    ...effectRequest({ order: 1 }),
    requestId: "request-2"
  });
  expect(first.error?.code).toBe(ControlPlaneErrorCode.EffectFailed);
  expect(replay.error?.messageKey).toBe("control-plane.effect-failed");
  expect(invoke).toHaveBeenCalledTimes(1);
});

it("restores tenant document state from a verified local backup", async () => {
  const grants = recoveryGrants();
  const reference = createReferenceControlPlane(referenceOptions({ grants }));
  const first = await reference.service.commitDocument(commitRequest());
  const backup = await reference.service.createBackup(
    metadata(ControlPlaneOperation.BackupCreate, "backup-request")
  );
  await reference.service.commitDocument({
    ...commitRequest("update-request"),
    document: document("client-update"),
    expectedRevision: requireValue(first.value).revision
  });
  await reference.service.restoreBackup({
    ...metadata(ControlPlaneOperation.BackupRestore, "restore-request"),
    backupId: requireValue(backup.value).backupId
  });
  const restored = await reference.service.readDocument({
    ...metadata(ControlPlaneOperation.DocumentRead, "read-request"),
    objectId: "document-1"
  });
  expect(requireValue(restored.value).revision).toBe("revision-1");
  expect(last(reference.store.realtimeMessages("tenant-a")).type).toBe(
    ControlPlaneRealtimeMessageType.TenantRestored
  );
});

it("detects realtime retention gaps so clients can resynchronize", async () => {
  const grants = [
    grant(ControlPlaneCapability.RealtimeResume, "tenant:tenant-a"),
    ...[1, 2, 3].map((id) => grant(ControlPlaneCapability.DocumentCommit, `document-${id}`))
  ];
  const reference = createReferenceControlPlane(referenceOptions({ grants, realtimeRetention: 2 }));
  for (const id of [1, 2, 3]) {
    await reference.service.commitDocument({
      ...metadata(ControlPlaneOperation.DocumentCommit, `request-${id}`),
      document: { id, revision: "client" },
      objectId: `document-${id}`
    });
  }
  const result = await reference.service.resumeRealtime({
    ...metadata(ControlPlaneOperation.RealtimeResume),
    afterSequence: 0
  });
  expect(result.status).toBe(ControlPlaneOperationStatus.Gap);
  expect(result.error?.code).toBe(ControlPlaneErrorCode.RealtimeGap);
});

function effectReference(invoke: () => Promise<{ accepted: boolean }>) {
  return createReferenceControlPlane(
    referenceOptions({
      effects: { "orders.submit": { invoke } },
      grants: [grant(ControlPlaneCapability.EffectInvoke, "document-1")]
    })
  );
}

function effectRequest(input: { readonly order: number }) {
  return {
    ...metadata(ControlPlaneOperation.EffectInvoke),
    effectId: "orders.submit",
    idempotencyKey: "effect-key-1",
    input,
    objectId: "document-1"
  };
}

function commitRequest(requestId = "commit-request") {
  return {
    ...metadata(ControlPlaneOperation.DocumentCommit, requestId),
    document: document(),
    objectId: "document-1"
  };
}

function recoveryGrants() {
  return [
    grant(ControlPlaneCapability.BackupCreate, "tenant:tenant-a"),
    grant(ControlPlaneCapability.BackupRestore, "tenant:tenant-a"),
    grant(ControlPlaneCapability.DocumentCommit, "document-1"),
    grant(ControlPlaneCapability.DocumentRead, "document-1")
  ];
}

function requireValue<TValue>(value: TValue | undefined): TValue {
  if (value === undefined) throw new Error("Expected a successful result value.");
  return value;
}

function last<TValue>(values: readonly TValue[]): TValue {
  const value = values.at(-1);
  if (value === undefined) throw new Error("Expected a final value.");
  return value;
}

function deferred<TValue>() {
  let resolve: (value: TValue) => void = () => undefined;
  const promise = new Promise<TValue>((complete) => {
    resolve = complete;
  });
  return { promise, resolve };
}
