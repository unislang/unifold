import { expect, it } from "vitest";

import { actor, proposalRequest } from "./collaboration.test-data.js";
import { approveProposal, commentOnProposal, submitProposal } from "./proposal-operations.js";
import { ReferenceCollaborationState } from "./reference-state.js";
import { referenceOptions } from "./reference.test-data.js";
import {
  CollaborationOperation,
  CollaborationProtocolVersion,
  CollaborationStatus
} from "./types.js";

it("commits unprotected proposals and records comments", () => {
  const state = new ReferenceCollaborationState(referenceOptions());
  const result = submitProposal(state, proposalRequest(), actor());
  expect(result.status).toBe(CollaborationStatus.Accepted);
  const commented = commentOnProposal(state, commentRequest(), actor("reviewer-1"));
  expect(commented.status).toBe(CollaborationStatus.Accepted);
  expect(requiredProposal(state).comments).toHaveLength(1);
});

it("holds protected proposals until a separate assigned reviewer approves", () => {
  const state = new ReferenceCollaborationState(
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
  const pending = submitProposal(state, proposalRequest(), actor());
  expect(pending.status).toBe(CollaborationStatus.ReviewRequired);
  const proposal = requiredProposal(state);
  expect(approveProposal(state, approveRequest("wrong-revision"), actor("reviewer-1")).status).toBe(
    CollaborationStatus.Conflict
  );
  const approved = approveProposal(
    state,
    approveRequest(proposal.candidateRevision),
    actor("reviewer-1")
  );
  expect(approved.status).toBe(CollaborationStatus.Accepted);
  expect(requiredBranch(state).headRevision).toBe(proposal.candidateRevision);
});

it("returns missing proposal and candidate outcomes and deduplicates reviewer approvals", () => {
  const state = protectedState(2, ["reviewer-1", "reviewer-2"]);
  expect(commentOnProposal(state, commentRequest(), actor()).status).toBe(
    CollaborationStatus.NotFound
  );
  submitProposal(state, proposalRequest(), actor());
  const revision = requiredProposal(state).candidateRevision;
  expect(approveProposal(state, approveRequest(revision), actor("reviewer-1")).status).toBe(
    CollaborationStatus.ReviewRequired
  );
  expect(approveProposal(state, approveRequest(revision), actor("reviewer-1")).status).toBe(
    CollaborationStatus.ReviewRequired
  );
  state.candidates.delete("proposal-1");
  expect(approveProposal(state, approveRequest(revision), actor("reviewer-2")).status).toBe(
    CollaborationStatus.NotFound
  );
});

function protectedState(requiredApprovals: number, reviewerIds: readonly string[]) {
  return new ReferenceCollaborationState(
    referenceOptions({
      mainBranchPolicy: {
        approvalTtlMs: 60_000,
        protected: true,
        requiredApprovals,
        reviewerIds,
        separateAuthorAndReviewer: true
      }
    })
  );
}

function commentRequest() {
  return {
    body: "Please retain the accessible name.",
    correlationId: "correlation-comment",
    operation: CollaborationOperation.Comment as const,
    proposalId: "proposal-1",
    protocolVersion: CollaborationProtocolVersion.Version1,
    requestId: "request-comment"
  };
}

function requiredProposal(state: ReferenceCollaborationState) {
  const proposal = state.proposal("proposal-1");
  if (proposal === undefined) throw new Error("Expected proposal-1.");
  return proposal;
}

function requiredBranch(state: ReferenceCollaborationState) {
  const branch = state.branch("main");
  if (branch === undefined) throw new Error("Expected the main branch.");
  return branch;
}

function approveRequest(expectedRevision: string) {
  return {
    correlationId: "correlation-approve",
    expectedRevision,
    operation: CollaborationOperation.Approve as const,
    proposalId: "proposal-1",
    protocolVersion: CollaborationProtocolVersion.Version1,
    requestId: "request-approve"
  };
}
