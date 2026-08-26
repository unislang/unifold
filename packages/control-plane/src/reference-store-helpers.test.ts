import { expect, it } from "vitest";

import { ControlPlaneOperationStatus } from "./types.js";
import {
  backupPayload,
  configuredLimit,
  firstRealtimeSequence,
  matchesExpectedRevision,
  oldestAvailableSequence,
  quotaExceeded,
  revisionRecord,
  succeeded
} from "./reference-store-helpers.js";

const command = {
  actorId: "actor-1",
  correlationId: "correlation-1",
  document: { revision: "client-value" },
  objectId: "document-1",
  occurredAt: "2026-01-01T00:00:00.000Z",
  requestId: "request-1",
  tenantId: "tenant-a"
};

it("assigns server revisions without mutating the submitted document", () => {
  const revision = revisionRecord(command, "revision-1", undefined);
  expect(revision.document["revision"]).toBe("revision-1");
  expect(command.document.revision).toBe("client-value");
  expect(matchesExpectedRevision(revision, "revision-1")).toBe(true);
  expect(succeeded(revision).status).toBe(ControlPlaneOperationStatus.Succeeded);
  expect(backupPayload("tenant-a", new Map([["document-1", revision]]))).toEqual({
    documents: [{ objectId: "document-1", revision }],
    tenantId: "tenant-a"
  });
  expect(configuredLimit(undefined, 1000)).toBe(1000);
  expect(oldestAvailableSequence(undefined, 2)).toBe(2);
  expect(firstRealtimeSequence([])).toBeUndefined();
  expect(quotaExceeded(undefined, 2, 1)).toBe(true);
});
