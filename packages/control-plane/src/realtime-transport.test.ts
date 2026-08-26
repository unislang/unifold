import { expect, it } from "vitest";

import { document, grant, metadata, referenceOptions } from "./control-plane.test-data.js";
import { createReferenceControlPlane } from "./reference.js";
import {
  createControlPlaneRealtimeCursor,
  ControlPlaneRealtimeProtocolErrorCode
} from "./realtime-transport.js";
import {
  ControlPlaneCapability,
  ControlPlaneOperation,
  ControlPlaneOperationStatus,
  ControlPlaneProtocolVersion,
  ControlPlaneRealtimeMessageType
} from "./types.js";

const pollMetadata = {
  correlationId: "correlation-realtime",
  protocolVersion: ControlPlaneProtocolVersion.Version1,
  requestId: "request-realtime",
  sessionToken: "token-a"
};

it("advances a validated contiguous cursor and returns no duplicate messages", async () => {
  const grants = [
    grant(ControlPlaneCapability.RealtimeResume, "tenant:tenant-a"),
    grant(ControlPlaneCapability.DocumentCommit, "document-1"),
    grant(ControlPlaneCapability.DocumentCommit, "document-2")
  ];
  const reference = createReferenceControlPlane(referenceOptions({ grants }));
  await Promise.all(
    ["document-1", "document-2"].map((id) =>
      reference.service.commitDocument({
        ...metadata(ControlPlaneOperation.DocumentCommit, `request-${id}`),
        document: document(),
        objectId: id
      })
    )
  );
  const cursor = createControlPlaneRealtimeCursor(reference.service);
  const first = await cursor.poll(pollMetadata);
  const second = await cursor.poll({ ...pollMetadata, requestId: "request-realtime-2" });
  expect(first.value?.messages.map((message) => message.sequence)).toEqual([1, 2]);
  expect(cursor.afterSequence).toBe(2);
  expect(second.value?.messages).toHaveLength(0);
});

it("preserves its cursor on an explicit retention gap until authoritative recovery", async () => {
  const grants = [
    grant(ControlPlaneCapability.RealtimeResume, "tenant:tenant-a"),
    ...[1, 2].map((id) => grant(ControlPlaneCapability.DocumentCommit, `document-${id}`))
  ];
  const reference = createReferenceControlPlane(referenceOptions({ grants, realtimeRetention: 1 }));
  for (const id of [1, 2]) {
    await reference.service.commitDocument({
      ...metadata(ControlPlaneOperation.DocumentCommit, `request-${id}`),
      document: document(),
      objectId: `document-${id}`
    });
  }
  const cursor = createControlPlaneRealtimeCursor(reference.service);
  const result = await cursor.poll(pollMetadata);
  expect(result.status).toBe(ControlPlaneOperationStatus.Gap);
  expect(cursor.afterSequence).toBe(0);
  cursor.resetAfterAuthoritativeRead(2);
  await expect(cursor.poll(pollMetadata)).resolves.toMatchObject({
    status: ControlPlaneOperationStatus.Succeeded
  });
});

it("rejects a discontinuous batch without moving the cursor", async () => {
  const discontinuous = createControlPlaneRealtimeCursor({
    resumeRealtime: async () => ({
      status: ControlPlaneOperationStatus.Succeeded,
      value: {
        latestSequence: 2,
        messages: [message(2)],
        oldestAvailableSequence: 1
      }
    })
  });
  await expect(discontinuous.poll(pollMetadata)).rejects.toMatchObject({
    code: ControlPlaneRealtimeProtocolErrorCode.InvalidBatch
  });
  expect(discontinuous.afterSequence).toBe(0);
});

it("rejects an oversized batch and an invalid recovery cursor", async () => {
  const oversized = createControlPlaneRealtimeCursor(
    {
      resumeRealtime: async () => ({
        status: ControlPlaneOperationStatus.Succeeded,
        value: {
          latestSequence: 2,
          messages: [message(1), message(2)],
          oldestAvailableSequence: 1
        }
      })
    },
    { maximumMessages: 1 }
  );
  await expect(oversized.poll(pollMetadata)).rejects.toMatchObject({
    code: ControlPlaneRealtimeProtocolErrorCode.MessageLimitExceeded
  });
  expect(() => oversized.resetAfterAuthoritativeRead(-1)).toThrow(RangeError);
});

function message(sequence: number) {
  return {
    correlationId: "correlation-1",
    occurredAt: "2026-01-01T00:00:00.000Z",
    payload: {},
    sequence,
    tenantId: "tenant-a",
    type: ControlPlaneRealtimeMessageType.DocumentCommitted
  };
}
