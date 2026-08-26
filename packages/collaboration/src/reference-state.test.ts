import { expect, it } from "vitest";

import { ReferenceCollaborationState, proposalSnapshot } from "./reference-state.js";
import { referenceOptions } from "./reference.test-data.js";
import { CollaborationProposalStatus } from "./types.js";

it("creates an immutable initial revision and supports explicit branch forks", () => {
  const state = new ReferenceCollaborationState(referenceOptions());
  const main = requiredBranch(state);
  expect(main.headRevision).toBe("revision-000000000001");
  expect(requiredRevision(state, main.headRevision).document["revision"]).toBe(main.headRevision);
  const fork = state.createBranch("feature", main.headRevision);
  expect(fork.headRevision).toBe(main.headRevision);
  expect(() => state.createBranch("feature", fork.headRevision)).toThrow(RangeError);
});

function requiredBranch(state: ReferenceCollaborationState) {
  const branch = state.branch("main");
  if (branch === undefined) throw new Error("Expected the main branch.");
  return branch;
}

function requiredRevision(state: ReferenceCollaborationState, revisionId: string) {
  const revision = state.revision(revisionId);
  if (revision === undefined) throw new Error("Expected the revision.");
  return revision;
}

it("returns frozen proposal snapshots without exposing mutable governance state", () => {
  const snapshot = proposalSnapshot({
    approvals: [],
    authorId: "author-1",
    baseRevision: "r1",
    branchId: "main",
    candidateRevision: "r2",
    comments: [],
    createdAt: "2026-08-25T12:00:00.000Z",
    proposalId: "proposal-1",
    rebased: false,
    status: CollaborationProposalStatus.Pending
  });
  expect(Object.isFrozen(snapshot)).toBe(true);
  expect(Object.isFrozen(snapshot.approvals)).toBe(true);
});
