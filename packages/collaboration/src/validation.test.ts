import { expect, it } from "vitest";

import { proposalRequest } from "./collaboration.test-data.js";
import {
  CollaborationOperation,
  CollaborationPatchOperationType,
  CollaborationProtocolVersion
} from "./types.js";
import { collaborationRequestErrors, isCollaborationRequest } from "./validation.js";

it("accepts an exact bounded proposal request", () => {
  expect(isCollaborationRequest(proposalRequest())).toBe(true);
});

it("rejects identity injection, unsafe pointers, malformed operations, and oversized requests", () => {
  expect(collaborationRequestErrors({ ...proposalRequest(), actorId: "untrusted" })).toContain(
    "unknown property"
  );
  const unsafe = operation({ path: "/view/__proto__/polluted" });
  expect(collaborationRequestErrors({ ...proposalRequest(), operations: [unsafe] })).toContain(
    "operations"
  );
  const missingValue = { op: CollaborationPatchOperationType.Replace, path: "/view/title" };
  expect(
    collaborationRequestErrors({ ...proposalRequest(), operations: [missingValue] })
  ).toContain("operations");
  expect(collaborationRequestErrors({ ...proposalRequest(), intent: "x".repeat(2_049) })).toContain(
    "intent"
  );
});

function operation(overrides: Record<string, unknown> = {}) {
  return {
    op: CollaborationPatchOperationType.Replace,
    path: "/view/title",
    value: "Updated",
    ...overrides
  };
}

it("accepts every bounded collaboration operation shape", () => {
  expect([approval(), comment(), presence(), publish(), undo()].every(isCollaborationRequest)).toBe(
    true
  );
});

it("validates copy, move, remove, and test patch shapes", () => {
  const operations = [
    { from: "/view/help", op: CollaborationPatchOperationType.Copy, path: "/view/description" },
    { from: "/view/help", op: CollaborationPatchOperationType.Move, path: "/view/description" },
    { op: CollaborationPatchOperationType.Remove, path: "/view/help" },
    { op: CollaborationPatchOperationType.Test, path: "/view/title", value: "Original title" }
  ];
  expect(isCollaborationRequest(proposalRequest({ operations }))).toBe(true);
  expect(
    collaborationRequestErrors(
      proposalRequest({ operations: [{ op: CollaborationPatchOperationType.Copy, path: "/x" }] })
    )
  ).toContain("operations");
});

it("rejects malformed metadata, presence, and empty patch batches", () => {
  expect(collaborationRequestErrors(null)).toContain("request must be a plain object");
  expect(collaborationRequestErrors({ ...approval(), protocolVersion: "2.0.0" })).toContain(
    "protocolVersion"
  );
  expect(collaborationRequestErrors({ ...presence(), expiresInMs: 999 })).toContain("expiresInMs");
  expect(
    collaborationRequestErrors({ ...presence(), cursor: { constructor: "unsafe" } })
  ).toContain("cursor");
  expect(collaborationRequestErrors(proposalRequest({ operations: [] }))).toContain("operations");
});

function metadata(operation: CollaborationOperation) {
  return {
    correlationId: "correlation-1",
    operation,
    protocolVersion: CollaborationProtocolVersion.Version1,
    requestId: "request-1"
  };
}

function approval() {
  return { ...metadata(CollaborationOperation.Approve), expectedRevision: "r2", proposalId: "p1" };
}

function comment() {
  return { ...metadata(CollaborationOperation.Comment), body: "Review note", proposalId: "p1" };
}

function presence() {
  return {
    ...metadata(CollaborationOperation.Presence),
    branchId: "main",
    cursor: { line: 1 },
    draft: false,
    expiresInMs: 1_000
  };
}

function publish() {
  return { ...metadata(CollaborationOperation.Publish), branchId: "main", revision: "r2" };
}

function undo() {
  return {
    ...metadata(CollaborationOperation.Undo),
    branchId: "main",
    idempotencyKey: "undo-1",
    targetRevision: "r2"
  };
}
