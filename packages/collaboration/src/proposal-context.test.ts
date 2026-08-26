import { expect, it } from "vitest";

import { actor, proposalRequest } from "./collaboration.test-data.js";
import { approvalContext, proposalContext } from "./proposal-context.js";
import { submitProposal } from "./proposal-operations.js";
import { ReferenceCollaborationState } from "./reference-state.js";
import { referenceOptions } from "./reference.test-data.js";
import { CollaborationStatus } from "./types.js";

it("resolves valid ancestry and reports missing branches", () => {
  const state = new ReferenceCollaborationState(referenceOptions());
  const valid = proposalContext(state, proposalRequest());
  expect("headRevision" in valid).toBe(true);
  const missing = proposalContext(state, proposalRequest({ branchId: "missing" }));
  expect("result" in missing ? missing.result.status : undefined).toBe(
    CollaborationStatus.NotFound
  );
});

it("reports duplicate proposals and a non-ancestor base as explicit failures", () => {
  const state = new ReferenceCollaborationState(referenceOptions());
  submitProposal(state, proposalRequest(), actor());
  expect(resultStatus(proposalContext(state, proposalRequest()))).toBe(CollaborationStatus.Invalid);
  expect(
    resultStatus(proposalContext(state, proposalRequest({ proposalId: "new", baseRevision: "r0" })))
  ).toBe(CollaborationStatus.Conflict);
});

it("reports missing proposals and branches during approval lookup", () => {
  const state = protectedState();
  expect(resultStatus(approvalContext(state, "missing"))).toBe(CollaborationStatus.NotFound);
  submitProposal(state, proposalRequest(), actor());
  state.branches.delete("main");
  expect(resultStatus(approvalContext(state, "proposal-1"))).toBe(CollaborationStatus.NotFound);
});

function resultStatus(
  context: ReturnType<typeof proposalContext> | ReturnType<typeof approvalContext>
) {
  if (!("result" in context)) throw new Error("Expected a collaboration failure.");
  return context.result.status;
}

function protectedState(): ReferenceCollaborationState {
  return new ReferenceCollaborationState(
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
}
