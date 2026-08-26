import { approveProposal, commentOnProposal, submitProposal } from "./proposal-operations.js";
import { denied, diagnostic, invalid, replayed, requestFingerprint } from "./reference-support.js";
import { ReferenceCollaborationState } from "./reference-state.js";
import {
  publishRevision,
  undoRevision,
  updateCollaborationPresence
} from "./revision-operations.js";
import {
  CollaborationCapability,
  CollaborationErrorCode,
  CollaborationOperation,
  CollaborationStatus,
  type CollaborationActorContext,
  type CollaborationBranchPolicy,
  type CollaborationEventBatch,
  type CollaborationRequest,
  type CollaborationResult,
  type CollaborationSubmitProposalRequest,
  type CollaborationUndoRequest,
  type ReferenceCollaborationOptions
} from "./types.js";
import { collaborationRequestErrors, isCollaborationRequest } from "./validation.js";

const operationCapabilities = new Map<CollaborationOperation, CollaborationCapability>([
  [CollaborationOperation.Approve, CollaborationCapability.Approve],
  [CollaborationOperation.Comment, CollaborationCapability.Comment],
  [CollaborationOperation.Presence, CollaborationCapability.Presence],
  [CollaborationOperation.Propose, CollaborationCapability.Propose],
  [CollaborationOperation.Publish, CollaborationCapability.Publish],
  [CollaborationOperation.Undo, CollaborationCapability.Undo]
]);

export class ReferenceCollaborationService {
  readonly #state: ReferenceCollaborationState;

  constructor(options: ReferenceCollaborationOptions) {
    this.#state = new ReferenceCollaborationState(options);
  }

  execute(request: unknown, actor: CollaborationActorContext): CollaborationResult {
    if (!isCollaborationRequest(request)) return invalidRequest(request);
    if (!this.authorized(request, actor)) return denied();
    return this.dispatch(request, actor);
  }

  createBranch(branchId: string, fromRevision: string, policy?: CollaborationBranchPolicy) {
    return this.#state.createBranch(branchId, fromRevision, policy);
  }

  branch(branchId: string) {
    return this.#state.branch(branchId);
  }

  proposal(proposalId: string) {
    return this.#state.proposal(proposalId);
  }

  revision(revision: string) {
    return this.#state.revision(revision);
  }

  head(branchId: string) {
    const branch = this.#state.branches.get(branchId);
    return branch === undefined ? undefined : this.#state.revision(branch.headRevision);
  }

  presence(tenantId: string, branchId: string) {
    return this.#state.presence.snapshot(tenantId, branchId, this.#state.clock.now().getTime());
  }

  resumeEvents(
    tenantId: string,
    afterSequence: number
  ): CollaborationResult<CollaborationEventBatch> {
    return this.#state.events.resume(tenantId, afterSequence);
  }

  private dispatch(request: CollaborationRequest, actor: CollaborationActorContext) {
    const handlers: Record<CollaborationOperation, () => CollaborationResult> = {
      [CollaborationOperation.Propose]: () => this.submit(request, actor),
      [CollaborationOperation.Approve]: () => approveProposal(this.#state, request as never, actor),
      [CollaborationOperation.Comment]: () =>
        commentOnProposal(this.#state, request as never, actor),
      [CollaborationOperation.Publish]: () => publishRevision(this.#state, request as never, actor),
      [CollaborationOperation.Undo]: () => this.undo(request, actor),
      [CollaborationOperation.Presence]: () =>
        updateCollaborationPresence(this.#state, request as never, actor)
    };
    return handlers[request.operation]();
  }

  private submit(request: CollaborationRequest, actor: CollaborationActorContext) {
    const proposal = request as CollaborationSubmitProposalRequest;
    return this.idempotent(request, actor, proposal.idempotencyKey, () =>
      submitProposal(this.#state, proposal, actor)
    );
  }

  private undo(request: CollaborationRequest, actor: CollaborationActorContext) {
    const undo = request as CollaborationUndoRequest;
    return this.idempotent(request, actor, undo.idempotencyKey, () =>
      undoRevision(this.#state, undo, actor)
    );
  }

  private idempotent(
    request: CollaborationRequest,
    actor: CollaborationActorContext,
    key: string,
    run: () => CollaborationResult
  ): CollaborationResult {
    const cacheKey = this.#state.idempotencyKey(actor, request.operation, key);
    const fingerprint = requestFingerprint(request);
    if (fingerprint === undefined) {
      return invalid(CollaborationErrorCode.InvalidRequest, "collaboration.request.invalid");
    }
    const existing = this.#state.idempotency.get(cacheKey);
    return existing === undefined
      ? this.recordIdempotency(cacheKey, fingerprint, run())
      : this.replayIdempotency(existing, fingerprint);
  }

  private recordIdempotency(
    cacheKey: string,
    fingerprint: string,
    result: CollaborationResult
  ): CollaborationResult {
    this.#state.idempotency.set(cacheKey, { fingerprint, result: structuredClone(result) });
    return result;
  }

  private replayIdempotency(
    existing: { readonly fingerprint: string; readonly result: CollaborationResult },
    fingerprint: string
  ): CollaborationResult {
    return existing.fingerprint === fingerprint
      ? replayed(existing.result)
      : this.#state.idempotencyConflict();
  }

  private authorized(request: CollaborationRequest, actor: CollaborationActorContext): boolean {
    const capability = operationCapabilities.get(request.operation);
    return [
      actor.tenantId === this.#state.tenantId,
      capability !== undefined,
      capability !== undefined && actor.capabilities.includes(capability)
    ].every(Boolean);
  }
}

function invalidRequest(request: unknown): CollaborationResult {
  const diagnostics = collaborationRequestErrors(request).map((path) =>
    diagnostic(CollaborationErrorCode.InvalidRequest, "collaboration.request.invalid", path)
  );
  return { diagnostics, status: CollaborationStatus.Invalid };
}
