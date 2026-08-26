import {
  CollaborationErrorCode,
  type CollaborationActorContext,
  type CollaborationBranch,
  type CollaborationDiagnostic,
  type CollaborationProposal
} from "./types.js";

export function approvalDiagnostic(
  branch: CollaborationBranch,
  proposal: CollaborationProposal,
  actor: CollaborationActorContext,
  expectedRevision: string,
  nowMs: number
): CollaborationDiagnostic | undefined {
  const checks = [
    staleApproval(proposal, expectedRevision),
    expiredApproval(proposal, nowMs),
    reviewerApproval(branch, actor.actorId),
    separatedApproval(branch, proposal, actor.actorId)
  ];
  return checks.find(isDiagnostic);
}

export function hasRequiredApprovals(
  branch: CollaborationBranch,
  reviewerIds: readonly string[]
): boolean {
  return new Set(reviewerIds).size >= branch.policy.requiredApprovals;
}

export function revisionMayPublish(
  branch: CollaborationBranch,
  proposal: CollaborationProposal | undefined,
  revision: string
): boolean {
  if (branch.headRevision !== revision) return false;
  if (!branch.policy.protected) return true;
  return protectedRevisionMayPublish(branch, proposal, revision);
}

function protectedRevisionMayPublish(
  branch: CollaborationBranch,
  proposal: CollaborationProposal | undefined,
  revision: string
): boolean {
  if (proposal === undefined) return false;
  if (proposal.candidateRevision !== revision) return false;
  return hasRequiredApprovals(
    branch,
    proposal.approvals.map((approval) => approval.actorId)
  );
}

function staleApproval(
  proposal: CollaborationProposal,
  expectedRevision: string
): CollaborationDiagnostic | undefined {
  return expectedRevision === proposal.candidateRevision
    ? undefined
    : diagnostic(CollaborationErrorCode.ApprovalStale);
}

function expiredApproval(
  proposal: CollaborationProposal,
  nowMs: number
): CollaborationDiagnostic | undefined {
  if (proposal.expiresAt === undefined) return undefined;
  return Date.parse(proposal.expiresAt) <= nowMs
    ? diagnostic(CollaborationErrorCode.ApprovalExpired)
    : undefined;
}

function reviewerApproval(
  branch: CollaborationBranch,
  actorId: string
): CollaborationDiagnostic | undefined {
  return isReviewer(branch, actorId)
    ? undefined
    : diagnostic(CollaborationErrorCode.ReviewerDenied);
}

function separatedApproval(
  branch: CollaborationBranch,
  proposal: CollaborationProposal,
  actorId: string
): CollaborationDiagnostic | undefined {
  const separated = !branch.policy.separateAuthorAndReviewer || proposal.authorId !== actorId;
  return separated ? undefined : diagnostic(CollaborationErrorCode.SeparationOfDuties);
}

function isDiagnostic(
  value: CollaborationDiagnostic | undefined
): value is CollaborationDiagnostic {
  return value !== undefined;
}

function isReviewer(branch: CollaborationBranch, actorId: string): boolean {
  const reviewers = branch.policy.reviewerIds;
  return reviewers.length === 0 || reviewers.includes(actorId);
}

function diagnostic(code: CollaborationErrorCode): CollaborationDiagnostic {
  return { code, messageKey: `collaboration.approval.${code}` };
}
