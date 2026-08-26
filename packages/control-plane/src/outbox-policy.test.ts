import { expect, it } from "vitest";

import {
  requireOutboxAcknowledgeCommand,
  requireOutboxLeaseCommand,
  requireOutboxReleaseCommand
} from "./outbox-policy.js";

it("accepts bounded canonical commands and rejects unsafe leases or sequence sets", () => {
  expect(() => requireOutboxLeaseCommand(lease())).not.toThrow();
  expect(() => requireOutboxLeaseCommand({ ...lease(), limit: 101 })).toThrow(TypeError);
  expect(() =>
    requireOutboxLeaseCommand({ ...lease(), leaseUntil: "2026-01-01T00:00:00.000Z" })
  ).toThrow(TypeError);
  expect(() => requireOutboxAcknowledgeCommand(acknowledgement([1, 1]))).toThrow(TypeError);
  expect(() => requireOutboxReleaseCommand(release([]))).toThrow(TypeError);
});

function lease() {
  return {
    leaseUntil: "2026-01-01T00:00:10.000Z",
    leasedAt: "2026-01-01T00:00:00.000Z",
    limit: 10,
    tenantId: "tenant-a",
    workerId: "worker-a"
  };
}

function acknowledgement(sequences: readonly number[]) {
  return {
    acknowledgedAt: "2026-01-01T00:00:01.000Z",
    sequences,
    tenantId: "tenant-a",
    workerId: "worker-a"
  };
}

function release(sequences: readonly number[]) {
  return {
    availableAt: "2026-01-01T00:00:02.000Z",
    sequences,
    tenantId: "tenant-a",
    workerId: "worker-a"
  };
}
