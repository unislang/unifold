import { describe, expect, it } from "vitest";

import type { ControlPlaneDurableStorePort } from "./ports.js";
import {
  ControlPlaneEffectLeaseStatus,
  ControlPlaneOperationStatus,
  ControlPlaneProtocolVersion
} from "./types.js";

interface DurableStoreHarness {
  readonly close?: () => void;
  readonly store: ControlPlaneDurableStorePort;
}

export function registerDurableStoreConformance(
  name: string,
  createHarness: () => DurableStoreHarness
): void {
  describe(`${name} durable-store conformance`, () => registerCases(createHarness));
}

function registerCases(createHarness: () => DurableStoreHarness): void {
  it("commits ordered state and partitions concurrent outbox reservations", () =>
    withHarness(createHarness, verifyConcurrentOutbox));
  it("serializes concurrent idempotency reservations and replays one durable result", () =>
    withHarness(createHarness, verifyIdempotency));
  it("restores a verified point-in-time tenant snapshot without crossing tenant keys", () =>
    withHarness(createHarness, verifyRecovery));
}

async function withHarness(
  createHarness: () => DurableStoreHarness,
  verify: (store: ControlPlaneDurableStorePort) => Promise<void>
): Promise<void> {
  const harness = createHarness();
  try {
    await verify(harness.store);
  } finally {
    harness.close?.();
  }
}

async function verifyConcurrentOutbox(store: ControlPlaneDurableStorePort): Promise<void> {
  await Promise.all([1, 2, 3].map((id) => store.commitDocument(commit(id))));
  const leased = await Promise.all([
    store.leaseOutbox(lease("worker-a", 2)),
    store.leaseOutbox(lease("worker-b", 2))
  ]);
  const entries = leased.flat();
  expect(entries.map(({ message }) => message.sequence).sort()).toEqual([1, 2, 3]);
  expect(new Set(entries.map(({ message }) => message.sequence)).size).toBe(3);
  await verifyLeaseOwnership(store, leased);
  await verifyLeaseExpiry(store, leased);
  expect((await store.resumeRealtime("tenant-a", 0)).value?.messages).toHaveLength(3);
}

async function verifyIdempotency(store: ControlPlaneDurableStorePort): Promise<void> {
  const leases = await Promise.all([
    store.beginEffect(effectLease),
    store.beginEffect(effectLease)
  ]);
  expect(leases.map(({ status }) => status).sort()).toEqual([
    ControlPlaneEffectLeaseStatus.Acquired,
    ControlPlaneEffectLeaseStatus.InProgress
  ]);
  expect((await store.completeEffect(effectCompletion)).status).toBe(
    ControlPlaneOperationStatus.Succeeded
  );
  const replay = await store.beginEffect(effectLease);
  expect(replay.status).toBe(ControlPlaneEffectLeaseStatus.Replay);
  expect(replay.result?.value?.output).toEqual({ receipt: "receipt-1" });
  const conflict = await store.beginEffect({ ...effectLease, fingerprint: "changed" });
  expect(conflict.status).toBe(ControlPlaneEffectLeaseStatus.Conflict);
}

async function verifyRecovery(store: ControlPlaneDurableStorePort): Promise<void> {
  const first = await store.commitDocument(commit(1));
  const backup = await store.createBackup(recovery("backup"));
  await store.commitDocument({
    ...commit(2),
    objectId: "document-1",
    expectedRevision: requireValue(first.value).revision
  });
  await store.restoreBackup({
    ...recovery("restore"),
    backupId: requireValue(backup.value).backupId
  });
  const restored = await store.readDocument("tenant-a", "document-1");
  expect(restored?.document["value"]).toBe(1);
  expect(await store.readDocument("tenant-b", "document-1")).toBeUndefined();
}

async function verifyLeaseOwnership(
  store: ControlPlaneDurableStorePort,
  leased: readonly (readonly { readonly message: { readonly sequence: number } }[])[]
): Promise<void> {
  const first = leased[0]?.[0];
  if (first === undefined) throw new Error("Expected worker-a to acquire an outbox row.");
  const sequence = first.message.sequence;
  expect(await store.acknowledgeOutbox(acknowledge("worker-b", [sequence]))).toBe(0);
  expect(await store.acknowledgeOutbox(acknowledge("worker-a", [sequence]))).toBe(1);
}

async function verifyLeaseExpiry(
  store: ControlPlaneDurableStorePort,
  leased: readonly (readonly { readonly message: { readonly sequence: number } }[])[]
): Promise<void> {
  const acknowledged = leased[0]?.[0]?.message.sequence;
  const remaining = leased
    .flat()
    .map(({ message }) => message.sequence)
    .filter((value) => value !== acknowledged);
  const retried = await store.leaseOutbox(
    leaseAt("worker-c", 3, "2026-01-01T00:00:10.000Z", "2026-01-01T00:00:20.000Z")
  );
  expect(retried.map(({ message }) => message.sequence)).toEqual(remaining);
  expect(retried.every(({ attempts }) => attempts === 2)).toBe(true);
  expect(await store.acknowledgeOutbox(acknowledge("worker-a", remaining))).toBe(0);
  expect(
    await store.acknowledgeOutbox(acknowledgeAt("worker-c", remaining, "2026-01-01T00:00:11.000Z"))
  ).toBe(2);
}

function commit(id: number) {
  return {
    actorId: "actor-1",
    correlationId: "correlation-1",
    document: { value: id },
    objectId: `document-${id}`,
    occurredAt: "2026-01-01T00:00:00.000Z",
    requestId: `request-${id}`,
    tenantId: "tenant-a"
  };
}

function lease(workerId: string, limit: number) {
  return leaseAt(workerId, limit, "2026-01-01T00:00:00.000Z", "2026-01-01T00:00:10.000Z");
}

function leaseAt(workerId: string, limit: number, leasedAt: string, leaseUntil: string) {
  return {
    leaseUntil,
    leasedAt,
    limit,
    tenantId: "tenant-a",
    workerId
  };
}

function acknowledge(workerId: string, sequences: readonly number[]) {
  return acknowledgeAt(workerId, sequences, "2026-01-01T00:00:01.000Z");
}

function acknowledgeAt(workerId: string, sequences: readonly number[], acknowledgedAt: string) {
  return {
    acknowledgedAt,
    sequences,
    tenantId: "tenant-a",
    workerId
  };
}

const effectLease = {
  effectId: "orders.submit",
  fingerprint: "fingerprint-1",
  idempotencyKey: "effect-1",
  objectId: "document-1",
  tenantId: "tenant-a"
};

const effectCompletion = {
  ...effectLease,
  actorId: "actor-1",
  completedAt: "2026-01-01T00:00:00.000Z",
  correlationId: "correlation-1",
  output: { receipt: "receipt-1" },
  protocolVersion: ControlPlaneProtocolVersion.Version1,
  requestId: "effect-request"
};

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
  if (value === undefined) throw new Error("Expected a conformance result value.");
  return value;
}
