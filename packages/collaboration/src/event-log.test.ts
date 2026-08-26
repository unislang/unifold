import { expect, it } from "vitest";

import { actor } from "./collaboration.test-data.js";
import { CollaborationEventLog } from "./event-log.js";
import { CollaborationEventType, CollaborationStatus } from "./types.js";

it("resumes tenant-filtered events and reports an explicit retention gap", () => {
  const log = new CollaborationEventLog(10);
  for (let index = 0; index < 12; index += 1) append(log, index);
  const gap = log.resume("tenant-1", 0);
  expect(gap.status).toBe(CollaborationStatus.Gap);
  expect(requiredBatch(gap).oldestAvailableSequence).toBe(3);
  const resumed = log.resume("tenant-1", 2);
  expect(resumed.status).toBe(CollaborationStatus.Accepted);
  expect(requiredBatch(resumed).messages).toHaveLength(10);
  expect(requiredBatch(resumed).latestSequence).toBe(12);
});

it("validates capacity and returns an empty initial resume batch", () => {
  expect(() => new CollaborationEventLog(0)).toThrow(RangeError);
  const result = new CollaborationEventLog().resume("tenant-1", 0);
  expect(result.status).toBe(CollaborationStatus.Accepted);
  expect(requiredBatch(result).messages).toEqual([]);
  expect(requiredBatch(result).latestSequence).toBe(0);
});

function append(log: CollaborationEventLog, index: number): void {
  log.append({
    actor: actor(),
    branchId: "main",
    correlationId: `correlation-${index}`,
    occurredAt: new Date(index * 1_000).toISOString(),
    payload: { index },
    type: CollaborationEventType.RevisionCommitted
  });
}

function requiredBatch(result: ReturnType<CollaborationEventLog["resume"]>) {
  if (result.value === undefined) throw new Error("Expected an event batch.");
  return result.value;
}
