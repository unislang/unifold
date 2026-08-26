import { diagnostic, invalid, notFound } from "./reference-support.js";
import type { MutableProposal, ReferenceCollaborationState } from "./reference-state.js";
import {
  CollaborationConflictKind,
  CollaborationErrorCode,
  CollaborationStatus,
  type CollaborationBranch,
  type CollaborationResult,
  type CollaborationRevision,
  type CollaborationSubmitProposalRequest
} from "./types.js";

type ProposalContext =
  | { readonly headRevision: string; readonly intervening: readonly CollaborationRevision[] }
  | { readonly result: CollaborationResult };

type ApprovalContext =
  | { readonly branch: CollaborationBranch; readonly proposal: MutableProposal }
  | { readonly result: CollaborationResult };

export function proposalContext(
  state: ReferenceCollaborationState,
  request: CollaborationSubmitProposalRequest
): ProposalContext {
  const branch = state.branches.get(request.branchId);
  if (branch === undefined) return { result: notFound(CollaborationErrorCode.BranchNotFound) };
  return proposalAncestry(state, request, branch.headRevision);
}

function baseNotAncestor(
  request: CollaborationSubmitProposalRequest,
  currentRevision: string
): CollaborationResult {
  return {
    conflicts: [
      {
        baseRevision: request.baseRevision,
        currentPath: "/",
        currentRevision,
        kind: CollaborationConflictKind.BaseNotAncestor,
        proposalPath: "/"
      }
    ],
    diagnostics: [
      diagnostic(CollaborationErrorCode.BaseNotAncestor, "collaboration.base.notAncestor")
    ],
    status: CollaborationStatus.Conflict
  };
}

export function approvalContext(
  state: ReferenceCollaborationState,
  proposalId: string
): ApprovalContext {
  const proposal = state.proposals.get(proposalId);
  if (proposal === undefined) {
    return { result: notFound(CollaborationErrorCode.ProposalNotFound) };
  }
  return approvalBranch(state, proposal);
}

function proposalAncestry(
  state: ReferenceCollaborationState,
  request: CollaborationSubmitProposalRequest,
  headRevision: string
): ProposalContext {
  if (state.proposals.has(request.proposalId)) {
    return {
      result: invalid(CollaborationErrorCode.InvalidRequest, "collaboration.proposal.duplicate")
    };
  }
  const intervening = state.intervening(headRevision, request.baseRevision);
  return intervening === undefined
    ? { result: baseNotAncestor(request, headRevision) }
    : { headRevision, intervening };
}

function approvalBranch(
  state: ReferenceCollaborationState,
  proposal: MutableProposal
): ApprovalContext {
  const branch = state.branch(proposal.branchId);
  return branch === undefined
    ? { result: notFound(CollaborationErrorCode.BranchNotFound) }
    : { branch, proposal };
}
