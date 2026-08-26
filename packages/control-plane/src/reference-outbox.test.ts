import { expect, it } from "vitest";

import { ReferenceControlPlaneOutbox } from "./reference-outbox.js";
import { ControlPlaneRealtimeMessageType } from "./types.js";

it("leases once, retries after release or expiry, and requires the current owner to acknowledge", () => {
  const outbox = new ReferenceControlPlaneOutbox(2);
  publish(outbox, 0);
  const first = outbox.lease(lease("worker-a", "2026-01-01T00:00:00.000Z"));
  expect(first).toMatchObject([{ attempts: 1, message: { sequence: 1 } }]);
  expect(outbox.lease(lease("worker-b", "2026-01-01T00:00:01.000Z"))).toEqual([]);
  expect(outbox.acknowledge(acknowledge("worker-b", "2026-01-01T00:00:01.000Z"))).toBe(0);
  expect(outbox.release(release("worker-a"))).toBe(1);
  const retry = outbox.lease(lease("worker-b", "2026-01-01T00:00:03.000Z"));
  expect(retry[0]?.attempts).toBe(2);
  expect(outbox.acknowledge(acknowledge("worker-b", "2026-01-01T00:00:04.000Z"))).toBe(1);
  expect(outbox.lease(lease("worker-c", "2026-01-01T00:00:20.000Z"))).toEqual([]);
});

it("retains realtime independently from acknowledged delivery records", () => {
  const outbox = new ReferenceControlPlaneOutbox(2);
  [0, 1, 2].forEach((index) => publish(outbox, index));
  expect(outbox.resume(0).status).toBe("gap");
  expect(outbox.messages().map(({ sequence }) => sequence)).toEqual([2, 3]);
});

function publish(outbox: ReferenceControlPlaneOutbox, index: number): void {
  outbox.publish({
    correlationId: "correlation-1",
    occurredAt: `2026-01-01T00:00:0${index}.000Z`,
    payload: { index },
    tenantId: "tenant-a",
    type: ControlPlaneRealtimeMessageType.DocumentCommitted
  });
}

function lease(workerId: string, leasedAt: string) {
  return {
    leaseUntil: new Date(Date.parse(leasedAt) + 10_000).toISOString(),
    leasedAt,
    limit: 10,
    tenantId: "tenant-a",
    workerId
  };
}

function acknowledge(workerId: string, acknowledgedAt: string) {
  return { acknowledgedAt, sequences: [1], tenantId: "tenant-a", workerId };
}

function release(workerId: string) {
  return {
    availableAt: "2026-01-01T00:00:02.000Z",
    sequences: [1],
    tenantId: "tenant-a",
    workerId
  };
}
