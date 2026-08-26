import { expect, it } from "vitest";

import { actor, proposalRequest } from "./collaboration.test-data.js";
import { ReferenceCollaborationService } from "./reference.js";
import { referenceOptions } from "./reference.test-data.js";
import {
  CollaborationCapability,
  CollaborationOperation,
  CollaborationPatchOperationType,
  CollaborationProtocolVersion,
  CollaborationStatus,
  type CollaborationResult
} from "./types.js";

it("executes trusted proposals with idempotent replay and tenant/capability denial", () => {
  const service = new ReferenceCollaborationService(referenceOptions());
  const first = service.execute(proposalRequest(), actor());
  const replay = service.execute(proposalRequest(), actor());
  const collision = service.execute(
    proposalRequest({ intent: "Different request", proposalId: "proposal-2" }),
    actor()
  );
  const denied = service.execute(
    proposalRequest({ idempotencyKey: "denied-key", proposalId: "denied" }),
    actor("author-1", [])
  );
  expect(first.status).toBe(CollaborationStatus.Accepted);
  expect(replay.status).toBe(CollaborationStatus.Replayed);
  expect(collision.status).toBe(CollaborationStatus.Invalid);
  expect(denied.status).toBe(CollaborationStatus.Denied);
  expect(requiredHead(service).revision).toBe(
    (first.value as { revision?: string } | undefined)?.revision
  );
});

it("auto-rebases disjoint paths and returns structured overlapping conflicts", () => {
  const service = new ReferenceCollaborationService(referenceOptions());
  const base = requiredHead(service).revision;
  service.execute(proposalRequest({ baseRevision: base }), actor());
  const disjoint = service.execute(
    proposalRequest({
      baseRevision: base,
      idempotencyKey: "idempotency-2",
      operations: [
        { op: CollaborationPatchOperationType.Replace, path: "/view/help", value: "Updated help" }
      ],
      proposalId: "proposal-2",
      requestId: "request-2"
    }),
    actor()
  );
  const conflict = service.execute(
    proposalRequest({
      baseRevision: base,
      idempotencyKey: "idempotency-3",
      proposalId: "proposal-3",
      requestId: "request-3"
    }),
    actor()
  );
  expect(disjoint.status).toBe(CollaborationStatus.Accepted);
  expect(requiredProposal(service, "proposal-2").rebased).toBe(true);
  expect(conflict.status).toBe(CollaborationStatus.Conflict);
  expect(conflict.conflicts?.[0]?.proposalPath).toBe("/view/title");
});

function requiredHead(service: ReferenceCollaborationService) {
  const head = service.head("main");
  if (head === undefined) throw new Error("Expected the main head.");
  return head;
}

function requiredProposal(service: ReferenceCollaborationService, proposalId: string) {
  const proposal = service.proposal(proposalId);
  if (proposal === undefined) throw new Error("Expected the proposal.");
  return proposal;
}

it("does not trust caller identity or cross-tenant context", () => {
  const service = new ReferenceCollaborationService(referenceOptions());
  expect(service.execute({ ...proposalRequest(), actorId: "forged" }, actor()).status).toBe(
    CollaborationStatus.Invalid
  );
  const foreign = { ...actor(), tenantId: "tenant-2" };
  expect(service.execute(proposalRequest(), foreign).status).toBe(CollaborationStatus.Denied);
  expect(
    actor("reader", [CollaborationCapability.Comment]).capabilities.includes(
      CollaborationCapability.Propose
    )
  ).toBe(false);
});

it("dispatches comment, presence, publish, and idempotent compensating undo operations", () => {
  const service = new ReferenceCollaborationService(referenceOptions());
  const proposed = service.execute(proposalRequest(), actor());
  const revision = requiredRevisionValue(proposed);
  const results = [
    service.execute(commentRequest(), actor()),
    service.execute(presenceRequest(), actor()),
    service.execute(publishRequest(revision), actor()),
    service.execute(undoRequest(revision), actor()),
    service.execute(undoRequest(revision), actor())
  ];
  expect(results.map(({ status }) => status)).toEqual([
    CollaborationStatus.Accepted,
    CollaborationStatus.Accepted,
    CollaborationStatus.Accepted,
    CollaborationStatus.Accepted,
    CollaborationStatus.Replayed
  ]);
  expect(service.presence("tenant-1", "main")).toHaveLength(1);
  expect(service.revision(revision)).toBeDefined();
  expect(requiredEventCount(service)).toBeGreaterThanOrEqual(6);
});

it("dispatches protected approval and exposes explicit branch forks", () => {
  const service = new ReferenceCollaborationService(
    referenceOptions({
      mainBranchPolicy: {
        approvalTtlMs: 60_000,
        protected: true,
        requiredApprovals: 1,
        reviewerIds: ["reviewer-1"],
        separateAuthorAndReviewer: true
      }
    })
  );
  expect(service.execute(proposalRequest(), actor()).status).toBe(
    CollaborationStatus.ReviewRequired
  );
  const proposal = requiredProposal(service, "proposal-1");
  expect(
    service.execute(approvalRequest(proposal.candidateRevision), actor("reviewer-1")).status
  ).toBe(CollaborationStatus.Accepted);
  const head = requiredHead(service);
  expect(service.createBranch("feature", head.revision).headRevision).toBe(head.revision);
  expect(service.branch("feature")?.branchId).toBe("feature");
  expect(service.head("missing")).toBeUndefined();
});

function metadata(operation: CollaborationOperation, suffix: string) {
  return {
    correlationId: `correlation-${suffix}`,
    operation,
    protocolVersion: CollaborationProtocolVersion.Version1,
    requestId: `request-${suffix}`
  };
}

function commentRequest() {
  return {
    ...metadata(CollaborationOperation.Comment, "comment"),
    body: "Looks good",
    proposalId: "proposal-1"
  };
}

function presenceRequest() {
  return {
    ...metadata(CollaborationOperation.Presence, "presence"),
    branchId: "main",
    cursor: { line: 1 },
    draft: true,
    expiresInMs: 60_000,
    selectedId: "root"
  };
}

function publishRequest(revision: string) {
  return { ...metadata(CollaborationOperation.Publish, "publish"), branchId: "main", revision };
}

function undoRequest(targetRevision: string) {
  return {
    ...metadata(CollaborationOperation.Undo, "undo"),
    branchId: "main",
    idempotencyKey: "undo-1",
    targetRevision
  };
}

function approvalRequest(expectedRevision: string) {
  return {
    ...metadata(CollaborationOperation.Approve, "approve"),
    expectedRevision,
    proposalId: "proposal-1"
  };
}

function requiredRevisionValue(result: CollaborationResult): string {
  const revision = (result.value as { revision?: unknown } | undefined)?.revision;
  if (typeof revision !== "string") throw new Error("Expected an accepted revision.");
  return revision;
}

function requiredEventCount(service: ReferenceCollaborationService): number {
  const batch = service.resumeEvents("tenant-1", 0).value;
  if (batch === undefined) throw new Error("Expected a realtime event batch.");
  return batch.messages.length;
}
