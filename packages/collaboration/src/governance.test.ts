import { expect, it } from "vitest";

import { actor } from "./collaboration.test-data.js";
import { approvalDiagnostic, hasRequiredApprovals, revisionMayPublish } from "./governance.js";
import {
  CollaborationErrorCode,
  CollaborationProposalStatus,
  type CollaborationBranch,
  type CollaborationProposal
} from "./types.js";

it("enforces assigned reviewers, separation of duties, expiry, and exact revisions", () => {
  const proposal = pendingProposal();
  expect(code(approvalDiagnostic(branch(), proposal, actor("author-1"), "r2", 0))).toBe(
    CollaborationErrorCode.ReviewerDenied
  );
  expect(code(approvalDiagnostic(branch(), proposal, actor("reviewer-1"), "wrong", 0))).toBe(
    CollaborationErrorCode.ApprovalStale
  );
  expect(code(approvalDiagnostic(branch(), proposal, actor("reviewer-1"), "r2", 2_000))).toBe(
    CollaborationErrorCode.ApprovalExpired
  );
  expect(
    code(
      approvalDiagnostic(
        branch({ reviewerIds: ["author-1"] }),
        proposal,
        actor("author-1"),
        "r2",
        0
      )
    )
  ).toBe(CollaborationErrorCode.SeparationOfDuties);
});

it("requires the configured approval count before exact-head publication", () => {
  const proposal = {
    ...pendingProposal(),
    approvals: [{ actorId: "reviewer-1", approvedAt: "now", revision: "r2" }]
  };
  expect(hasRequiredApprovals(branch(), ["reviewer-1"])).toBe(true);
  expect(revisionMayPublish(branch(), proposal, "r2")).toBe(true);
  expect(revisionMayPublish(branch(), proposal, "r1")).toBe(false);
});

function branch(policy: Partial<CollaborationBranch["policy"]> = {}): CollaborationBranch {
  return {
    branchId: "main",
    headRevision: "r2",
    policy: {
      approvalTtlMs: 60_000,
      protected: true,
      requiredApprovals: 1,
      reviewerIds: ["reviewer-1"],
      separateAuthorAndReviewer: true,
      ...policy
    }
  };
}

function code(value: ReturnType<typeof approvalDiagnostic>) {
  if (value === undefined) throw new Error("Expected an approval diagnostic.");
  return value.code;
}

function pendingProposal(): CollaborationProposal {
  return {
    approvals: [],
    authorId: "author-1",
    baseRevision: "r1",
    branchId: "main",
    candidateRevision: "r2",
    comments: [],
    createdAt: "1970-01-01T00:00:00.000Z",
    expiresAt: "1970-01-01T00:00:01.000Z",
    proposalId: "proposal-1",
    rebased: false,
    status: CollaborationProposalStatus.Pending
  };
}
