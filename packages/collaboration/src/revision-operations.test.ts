import { expect, it } from "vitest";

import { actor, proposalRequest } from "./collaboration.test-data.js";
import { submitProposal } from "./proposal-operations.js";
import { ReferenceCollaborationState } from "./reference-state.js";
import { referenceOptions } from "./reference.test-data.js";
import {
  publishRevision,
  undoRevision,
  updateCollaborationPresence
} from "./revision-operations.js";
import {
  CollaborationErrorCode,
  CollaborationOperation,
  CollaborationProtocolVersion,
  CollaborationStatus
} from "./types.js";

it("publishes only the exact committed head and undoes with a compensating revision", () => {
  const state = new ReferenceCollaborationState(referenceOptions());
  submitProposal(state, proposalRequest(), actor());
  const head = requiredHead(state);
  expect(publishRevision(state, publishRequest(head), actor()).status).toBe(
    CollaborationStatus.Accepted
  );
  expect(undoRevision(state, undoRequest("revision-000000000001"), actor()).status).toBe(
    CollaborationStatus.Conflict
  );
  const undone = undoRevision(state, undoRequest(head), actor());
  expect(undone.status).toBe(CollaborationStatus.Accepted);
  expect((undone.value as { compensatesRevision?: string }).compensatesRevision).toBe(head);
  expect(requiredHead(state)).not.toBe(head);
  expect(state.revision(head)).toBeDefined();
  expect(publishRevision(state, publishRequest(head), actor()).status).toBe(
    CollaborationStatus.Denied
  );
});

it("returns explicit missing-resource outcomes for revision and presence operations", () => {
  const state = new ReferenceCollaborationState(referenceOptions());
  expect(publishRevision(state, publishForBranch("missing", "r1"), actor()).status).toBe(
    CollaborationStatus.NotFound
  );
  expect(updateCollaborationPresence(state, presenceRequest("missing"), actor()).status).toBe(
    CollaborationStatus.NotFound
  );
  expect(undoRevision(state, undoRequest("revision-000000000001"), actor()).status).toBe(
    CollaborationStatus.NotFound
  );
  requiredMutableBranch(state).headRevision = "unknown";
  expect(undoRevision(state, undoRequest("unknown"), actor()).status).toBe(
    CollaborationStatus.NotFound
  );
});

it("rejects a compensating revision when host validation changes", () => {
  let validations = 0;
  const state = new ReferenceCollaborationState(
    referenceOptions({
      validation: {
        validate: () =>
          ++validations < 3
            ? []
            : [{ code: CollaborationErrorCode.SchemaRejected, messageKey: "schema.changed" }]
      }
    })
  );
  submitProposal(state, proposalRequest(), actor());
  expect(undoRevision(state, undoRequest(requiredHead(state)), actor()).status).toBe(
    CollaborationStatus.Invalid
  );
});

function publishForBranch(branchId: string, revision: string) {
  return {
    branchId,
    correlationId: "correlation-publish",
    operation: CollaborationOperation.Publish as const,
    protocolVersion: CollaborationProtocolVersion.Version1,
    requestId: "request-publish",
    revision
  };
}

function presenceRequest(branchId: string) {
  return {
    branchId,
    correlationId: "correlation-presence",
    draft: false,
    expiresInMs: 1_000,
    operation: CollaborationOperation.Presence as const,
    protocolVersion: CollaborationProtocolVersion.Version1,
    requestId: "request-presence"
  };
}

function requiredMutableBranch(state: ReferenceCollaborationState) {
  const branch = state.branches.get("main");
  if (branch === undefined) throw new Error("Expected the mutable main branch.");
  return branch;
}

function publishRequest(revision: string) {
  return {
    branchId: "main",
    correlationId: "correlation-publish",
    operation: CollaborationOperation.Publish as const,
    protocolVersion: CollaborationProtocolVersion.Version1,
    requestId: "request-publish",
    revision
  };
}

function requiredHead(state: ReferenceCollaborationState): string {
  const branch = state.branch("main");
  if (branch === undefined) throw new Error("Expected the main branch.");
  return branch.headRevision;
}

function undoRequest(targetRevision: string) {
  return {
    branchId: "main",
    correlationId: "correlation-undo",
    idempotencyKey: "undo-1",
    operation: CollaborationOperation.Undo as const,
    protocolVersion: CollaborationProtocolVersion.Version1,
    requestId: "request-undo",
    targetRevision
  };
}
