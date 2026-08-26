import type { JsonObject } from "@unislang/unifold-contracts";

import { collaborationConflicts } from "./conflict.js";
import { approvalDiagnostic, hasRequiredApprovals } from "./governance.js";
import { applyCollaborationPatch, type CollaborationPatchSuccess } from "./patch.js";
import { approvalContext, proposalContext } from "./proposal-context.js";
import { accepted, conflict, notFound, reviewRequired } from "./reference-support.js";
import {
  proposalSnapshot,
  type MutableProposal,
  type PendingCandidate,
  type ReferenceCollaborationState
} from "./reference-state.js";
import {
  CollaborationErrorCode,
  CollaborationEventType,
  CollaborationProposalStatus,
  CollaborationStatus,
  type CollaborationActorContext,
  type CollaborationApproveRequest,
  type CollaborationBranch,
  type CollaborationBranchPolicy,
  type CollaborationCommentRequest,
  type CollaborationDiagnostic,
  type CollaborationResult,
  type CollaborationSubmitProposalRequest
} from "./types.js";

export function submitProposal(
  state: ReferenceCollaborationState,
  request: CollaborationSubmitProposalRequest,
  actor: CollaborationActorContext
): CollaborationResult {
  const context = proposalContext(state, request);
  if ("result" in context) return context.result;
  const conflicts = collaborationConflicts(
    request.baseRevision,
    context.headRevision,
    request.operations,
    context.intervening
  );
  if (conflicts.length > 0) return { conflicts, status: CollaborationStatus.Conflict };
  return createProposal(state, request, actor, context.headRevision);
}

export function approveProposal(
  state: ReferenceCollaborationState,
  request: CollaborationApproveRequest,
  actor: CollaborationActorContext
): CollaborationResult {
  const context = approvalContext(state, request.proposalId);
  if ("result" in context) return context.result;
  return evaluateApproval(state, request, actor, context.proposal, context.branch);
}

function evaluateApproval(
  state: ReferenceCollaborationState,
  request: CollaborationApproveRequest,
  actor: CollaborationActorContext,
  proposal: MutableProposal,
  branch: CollaborationBranch
): CollaborationResult {
  const issue = approvalDiagnostic(
    branch,
    proposalSnapshot(proposal),
    actor,
    request.expectedRevision,
    state.clock.now().getTime()
  );
  if (issue !== undefined) return approvalFailure(issue);
  recordApproval(state, proposal, request, actor);
  const reviewers = proposal.approvals.map((item) => item.actorId);
  if (!hasRequiredApprovals(branch, reviewers)) return reviewRequired(proposalSnapshot(proposal));
  return finishApprovedProposal(state, proposal);
}

export function commentOnProposal(
  state: ReferenceCollaborationState,
  request: CollaborationCommentRequest,
  actor: CollaborationActorContext
): CollaborationResult {
  const proposal = state.proposals.get(request.proposalId);
  if (proposal === undefined) return notFound(CollaborationErrorCode.ProposalNotFound);
  const comment = {
    actorId: actor.actorId,
    body: request.body,
    commentId: `comment-${proposal.comments.length + 1}`,
    createdAt: state.nowIso()
  };
  proposal.comments.push(comment);
  emitCollaborationEvent(
    state,
    CollaborationEventType.CommentAdded,
    actor,
    proposal.branchId,
    request.correlationId,
    { commentId: comment.commentId, proposalId: proposal.proposalId }
  );
  return accepted(proposalSnapshot(proposal));
}

function commitProposal(
  state: ReferenceCollaborationState,
  proposal: MutableProposal,
  candidate: PendingCandidate
) {
  const revision = state.commit(candidate, proposal.proposalId);
  const branch = state.branches.get(proposal.branchId);
  if (branch !== undefined) branch.headRevision = revision.revision;
  proposal.status = CollaborationProposalStatus.Committed;
  state.candidates.delete(proposal.proposalId);
  emitCollaborationEvent(
    state,
    CollaborationEventType.RevisionCommitted,
    candidate.actor,
    proposal.branchId,
    candidate.correlationId,
    { proposalId: proposal.proposalId, revision: revision.revision }
  );
  return revision;
}

export function emitCollaborationEvent(
  state: ReferenceCollaborationState,
  type: CollaborationEventType,
  actor: CollaborationActorContext,
  branchId: string,
  correlationId: string,
  payload: JsonObject
): void {
  state.events.append({
    actor,
    branchId,
    correlationId,
    occurredAt: state.nowIso(),
    payload,
    type
  });
}

function createProposal(
  state: ReferenceCollaborationState,
  request: CollaborationSubmitProposalRequest,
  actor: CollaborationActorContext,
  parentRevision: string
): CollaborationResult {
  const identity = state.nextRevisionIdentity();
  const parent = state.revisions.get(parentRevision);
  if (parent === undefined) return notFound(CollaborationErrorCode.RevisionNotFound);
  const applied = applyCollaborationPatch(
    parent.document,
    request.operations,
    identity.revision,
    state.validation
  );
  if (!applied.success) {
    return { diagnostics: applied.diagnostics, status: CollaborationStatus.Invalid };
  }
  const candidate = pendingCandidate(request, actor, parentRevision, identity, applied);
  return recordProposal(state, request, actor, candidate);
}

function pendingCandidate(
  request: CollaborationSubmitProposalRequest,
  actor: CollaborationActorContext,
  parentRevision: string,
  identity: { readonly revision: string; readonly sequence: number },
  applied: CollaborationPatchSuccess
): PendingCandidate {
  return {
    actor,
    branchId: request.branchId,
    changedPaths: applied.changedPaths,
    correlationId: request.correlationId,
    document: applied.document,
    parentRevision,
    removedPaths: applied.removedPaths,
    revision: identity.revision,
    sequence: identity.sequence
  };
}

function recordProposal(
  state: ReferenceCollaborationState,
  request: CollaborationSubmitProposalRequest,
  actor: CollaborationActorContext,
  candidate: PendingCandidate
): CollaborationResult {
  const branch = state.branches.get(request.branchId);
  if (branch === undefined) return notFound(CollaborationErrorCode.BranchNotFound);
  const proposal = mutableProposal(state, request, actor, candidate, branch.policy);
  state.proposals.set(request.proposalId, proposal);
  state.candidates.set(request.proposalId, candidate);
  emitProposalCreated(state, request, actor, proposal, candidate);
  if (branch.policy.protected) return reviewRequired(proposalSnapshot(proposal));
  return accepted(commitProposal(state, proposal, candidate));
}

function mutableProposal(
  state: ReferenceCollaborationState,
  request: CollaborationSubmitProposalRequest,
  actor: CollaborationActorContext,
  candidate: PendingCandidate,
  policy: CollaborationBranchPolicy
): MutableProposal {
  const createdAt = state.nowIso();
  const expiresAt = proposalExpiry(policy, createdAt);
  return {
    approvals: [],
    authorId: actor.actorId,
    baseRevision: request.baseRevision,
    branchId: request.branchId,
    candidateRevision: candidate.revision,
    comments: [],
    createdAt,
    ...(expiresAt === undefined ? {} : { expiresAt }),
    proposalId: request.proposalId,
    rebased: request.baseRevision !== candidate.parentRevision,
    status: CollaborationProposalStatus.Pending
  };
}

function proposalExpiry(policy: CollaborationBranchPolicy, createdAt: string): string | undefined {
  if (!policy.protected) return undefined;
  return new Date(Date.parse(createdAt) + policy.approvalTtlMs).toISOString();
}

function emitProposalCreated(
  state: ReferenceCollaborationState,
  request: CollaborationSubmitProposalRequest,
  actor: CollaborationActorContext,
  proposal: MutableProposal,
  candidate: PendingCandidate
): void {
  emitCollaborationEvent(
    state,
    CollaborationEventType.ProposalCreated,
    actor,
    request.branchId,
    request.correlationId,
    { proposalId: request.proposalId, rebased: proposal.rebased, revision: candidate.revision }
  );
}

function recordApproval(
  state: ReferenceCollaborationState,
  proposal: MutableProposal,
  request: CollaborationApproveRequest,
  actor: CollaborationActorContext
): void {
  if (proposal.approvals.some((approval) => approval.actorId === actor.actorId)) return;
  proposal.approvals.push({
    actorId: actor.actorId,
    approvedAt: state.nowIso(),
    revision: request.expectedRevision
  });
  emitCollaborationEvent(
    state,
    CollaborationEventType.ApprovalRecorded,
    actor,
    proposal.branchId,
    request.correlationId,
    { proposalId: proposal.proposalId, revision: request.expectedRevision }
  );
}

function finishApprovedProposal(
  state: ReferenceCollaborationState,
  proposal: MutableProposal
): CollaborationResult {
  const context = approvedCandidateContext(state, proposal);
  if ("result" in context) return context.result;
  if (context.headRevision !== context.candidate.parentRevision) {
    proposal.status = CollaborationProposalStatus.Stale;
    return conflict(CollaborationErrorCode.ApprovalStale, "collaboration.approval.stale");
  }
  return accepted(commitProposal(state, proposal, context.candidate));
}

function approvalFailure(issue: CollaborationDiagnostic): CollaborationResult {
  const status =
    issue.code === CollaborationErrorCode.ApprovalStale
      ? CollaborationStatus.Conflict
      : CollaborationStatus.Denied;
  return { diagnostics: [issue], status };
}

function approvedCandidateContext(
  state: ReferenceCollaborationState,
  proposal: MutableProposal
):
  | { readonly candidate: PendingCandidate; readonly headRevision: string }
  | { readonly result: CollaborationResult } {
  const candidate = state.candidates.get(proposal.proposalId);
  if (candidate === undefined) {
    return { result: notFound(CollaborationErrorCode.RevisionNotFound) };
  }
  const branch = state.branches.get(proposal.branchId);
  return branch === undefined
    ? { result: notFound(CollaborationErrorCode.BranchNotFound) }
    : { candidate, headRevision: branch.headRevision };
}
