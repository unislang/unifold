import type { JsonObject } from "@unislang/unifold-contracts";

import { revisionMayPublish } from "./governance.js";
import { emitCollaborationEvent } from "./proposal-operations.js";
import { accepted, conflict, denied, freezeDocument, notFound } from "./reference-support.js";
import type {
  MutableBranch,
  PendingCandidate,
  ReferenceCollaborationState
} from "./reference-state.js";
import {
  CollaborationErrorCode,
  CollaborationEventType,
  CollaborationStatus,
  type CollaborationActorContext,
  type CollaborationBranch,
  type CollaborationProposal,
  type CollaborationPresenceRequest,
  type CollaborationPublishRequest,
  type CollaborationResult,
  type CollaborationRevision,
  type CollaborationUndoRequest
} from "./types.js";

export function publishRevision(
  state: ReferenceCollaborationState,
  request: CollaborationPublishRequest,
  actor: CollaborationActorContext
): CollaborationResult {
  const context = publishContext(state, request);
  if ("result" in context) return context.result;
  if (!revisionMayPublish(context.snapshot, context.proposal, request.revision)) {
    return denied(CollaborationErrorCode.PublishNotApproved);
  }
  context.branch.publishedRevision = request.revision;
  emitCollaborationEvent(
    state,
    CollaborationEventType.RevisionPublished,
    actor,
    request.branchId,
    request.correlationId,
    { revision: request.revision }
  );
  return accepted({ branchId: request.branchId, publishedRevision: request.revision });
}

export function undoRevision(
  state: ReferenceCollaborationState,
  request: CollaborationUndoRequest,
  actor: CollaborationActorContext
): CollaborationResult {
  const context = undoContext(state, request);
  if ("result" in context) return context.result;
  return commitCompensation(
    state,
    request,
    actor,
    context.target.revision,
    context.parent.document
  );
}

function publishContext(
  state: ReferenceCollaborationState,
  request: CollaborationPublishRequest
):
  | {
      readonly branch: MutableBranch;
      readonly proposal: CollaborationProposal | undefined;
      readonly snapshot: CollaborationBranch;
    }
  | { readonly result: CollaborationResult } {
  const branch = state.branches.get(request.branchId);
  const snapshot = state.branch(request.branchId);
  if ([branch === undefined, snapshot === undefined].some(Boolean)) {
    return { result: notFound(CollaborationErrorCode.BranchNotFound) };
  }
  return publishProposalContext(
    state,
    request,
    branch as MutableBranch,
    snapshot as CollaborationBranch
  );
}

function publishProposalContext(
  state: ReferenceCollaborationState,
  request: CollaborationPublishRequest,
  branch: MutableBranch,
  snapshot: CollaborationBranch
) {
  const revision = state.revisions.get(request.revision);
  const proposalId = revision?.proposalId;
  const proposal = proposalId === undefined ? undefined : state.proposal(proposalId);
  return { branch, proposal, snapshot };
}

function undoContext(
  state: ReferenceCollaborationState,
  request: CollaborationUndoRequest
):
  | { readonly parent: CollaborationRevision; readonly target: CollaborationRevision }
  | { readonly result: CollaborationResult } {
  const branch = state.branches.get(request.branchId);
  if (branch === undefined) return { result: notFound(CollaborationErrorCode.BranchNotFound) };
  if (branch.headRevision !== request.targetRevision) {
    return { result: conflict(CollaborationErrorCode.ApprovalStale, "collaboration.undo.stale") };
  }
  return undoRevisionContext(state, request.targetRevision);
}

function undoRevisionContext(
  state: ReferenceCollaborationState,
  targetRevision: string
):
  | { readonly parent: CollaborationRevision; readonly target: CollaborationRevision }
  | { readonly result: CollaborationResult } {
  const target = state.revisions.get(targetRevision);
  if (target === undefined) return { result: notFound(CollaborationErrorCode.RevisionNotFound) };
  return undoParentContext(state, target);
}

function undoParentContext(
  state: ReferenceCollaborationState,
  target: CollaborationRevision
):
  | { readonly parent: CollaborationRevision; readonly target: CollaborationRevision }
  | { readonly result: CollaborationResult } {
  const parent =
    target.parentRevision === undefined ? undefined : state.revisions.get(target.parentRevision);
  return parent === undefined
    ? { result: notFound(CollaborationErrorCode.RevisionNotFound) }
    : { parent, target };
}

export function updateCollaborationPresence(
  state: ReferenceCollaborationState,
  request: CollaborationPresenceRequest,
  actor: CollaborationActorContext
): CollaborationResult {
  if (!state.branches.has(request.branchId)) {
    return notFound(CollaborationErrorCode.BranchNotFound);
  }
  const presence = state.presence.update(request, actor, state.clock.now().getTime());
  emitCollaborationEvent(
    state,
    CollaborationEventType.PresenceChanged,
    actor,
    request.branchId,
    request.correlationId,
    presencePayload(request, actor)
  );
  return accepted(presence);
}

function commitCompensation(
  state: ReferenceCollaborationState,
  request: CollaborationUndoRequest,
  actor: CollaborationActorContext,
  targetRevision: string,
  parentDocument: JsonObject
): CollaborationResult {
  const identity = state.nextRevisionIdentity();
  const document = freezeDocument({ ...parentDocument, revision: identity.revision });
  const diagnostics = state.validation.validate(document);
  if (diagnostics.length > 0) return { diagnostics, status: CollaborationStatus.Invalid };
  const candidate = compensationCandidate(request, actor, targetRevision, identity, document);
  const revision = state.commit(candidate, undefined, targetRevision);
  const branch = state.branches.get(request.branchId);
  if (branch !== undefined) branch.headRevision = revision.revision;
  emitCompensation(state, request, actor, revision.revision);
  return accepted(revision);
}

function compensationCandidate(
  request: CollaborationUndoRequest,
  actor: CollaborationActorContext,
  targetRevision: string,
  identity: { readonly revision: string; readonly sequence: number },
  document: JsonObject
): PendingCandidate {
  return {
    actor,
    branchId: request.branchId,
    changedPaths: ["/"],
    correlationId: request.correlationId,
    document,
    parentRevision: targetRevision,
    removedPaths: [],
    revision: identity.revision,
    sequence: identity.sequence
  };
}

function emitCompensation(
  state: ReferenceCollaborationState,
  request: CollaborationUndoRequest,
  actor: CollaborationActorContext,
  revision: string
): void {
  emitCollaborationEvent(
    state,
    CollaborationEventType.RevisionCommitted,
    actor,
    request.branchId,
    request.correlationId,
    { compensatesRevision: request.targetRevision, revision }
  );
}

function presencePayload(
  request: CollaborationPresenceRequest,
  actor: CollaborationActorContext
): JsonObject {
  return {
    actorId: actor.actorId,
    draft: request.draft,
    ...(request.selectedId === undefined ? {} : { selectedId: request.selectedId })
  };
}
