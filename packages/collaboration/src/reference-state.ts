import type { JsonObject } from "@unislang/unifold-contracts";

import { CollaborationEventLog } from "./event-log.js";
import { CollaborationPresenceRegistry } from "./presence.js";
import { freezeDocument, normalizeBranchPolicy } from "./reference-support.js";
import {
  CollaborationActorType,
  CollaborationErrorCode,
  CollaborationProposalStatus,
  CollaborationStatus,
  type CollaborationActorContext,
  type CollaborationApproval,
  type CollaborationBranch,
  type CollaborationBranchPolicy,
  type CollaborationComment,
  type CollaborationProposal,
  type CollaborationResult,
  type CollaborationRevision,
  type ReferenceCollaborationOptions
} from "./types.js";

export interface PendingCandidate {
  readonly actor: CollaborationActorContext;
  readonly branchId: string;
  readonly changedPaths: readonly string[];
  readonly correlationId: string;
  readonly document: JsonObject;
  readonly parentRevision: string;
  readonly removedPaths: readonly string[];
  readonly revision: string;
  readonly sequence: number;
}

export interface MutableProposal {
  approvals: CollaborationApproval[];
  readonly authorId: string;
  readonly baseRevision: string;
  readonly branchId: string;
  readonly candidateRevision: string;
  comments: CollaborationComment[];
  readonly createdAt: string;
  readonly expiresAt?: string;
  readonly proposalId: string;
  readonly rebased: boolean;
  status: CollaborationProposalStatus;
}

export interface MutableBranch {
  readonly branchId: string;
  headRevision: string;
  readonly policy: CollaborationBranchPolicy;
  publishedRevision?: string;
}

interface IdempotencyEntry {
  readonly fingerprint: string;
  readonly result: CollaborationResult;
}

export class ReferenceCollaborationState {
  readonly branches = new Map<string, MutableBranch>();
  readonly candidates = new Map<string, PendingCandidate>();
  readonly clock;
  readonly events: CollaborationEventLog;
  readonly idempotency = new Map<string, IdempotencyEntry>();
  readonly presence = new CollaborationPresenceRegistry();
  readonly proposals = new Map<string, MutableProposal>();
  readonly revisions = new Map<string, CollaborationRevision>();
  readonly tenantId: string;
  readonly validation;
  #revisionSequence = 0;

  constructor(options: ReferenceCollaborationOptions) {
    this.clock = options.clock ?? { now: () => new Date() };
    this.events = new CollaborationEventLog(options.eventCapacity);
    this.tenantId = options.tenantId;
    this.validation = options.validation;
    const identity = this.nextRevisionIdentity();
    const document = freezeDocument({ ...options.initialDocument, revision: identity.revision });
    const diagnostics = this.validation.validate(document);
    if (diagnostics.length > 0)
      throw new TypeError("The initial collaboration document is invalid.");
    const initial = this.initialRevision(document, identity);
    this.revisions.set(initial.revision, initial);
    this.branches.set("main", {
      branchId: "main",
      headRevision: initial.revision,
      policy: normalizeBranchPolicy(options.mainBranchPolicy)
    });
  }

  nextRevisionIdentity(): { readonly revision: string; readonly sequence: number } {
    const sequence = ++this.#revisionSequence;
    return { revision: `revision-${sequence.toString().padStart(12, "0")}`, sequence };
  }

  commit(candidate: PendingCandidate, proposalId?: string, compensatesRevision?: string) {
    const revision: CollaborationRevision = Object.freeze({
      actorId: candidate.actor.actorId,
      actorType: candidate.actor.actorType,
      branchId: candidate.branchId,
      changedPaths: Object.freeze([...candidate.changedPaths]),
      committedAt: this.nowIso(),
      ...(compensatesRevision === undefined ? {} : { compensatesRevision }),
      correlationId: candidate.correlationId,
      document: candidate.document,
      parentRevision: candidate.parentRevision,
      ...(proposalId === undefined ? {} : { proposalId }),
      removedPaths: Object.freeze([...candidate.removedPaths]),
      revision: candidate.revision,
      sequence: candidate.sequence,
      tenantId: candidate.actor.tenantId
    });
    this.revisions.set(revision.revision, revision);
    return revision;
  }

  createBranch(
    branchId: string,
    fromRevision: string,
    policy?: CollaborationBranchPolicy
  ): CollaborationBranch {
    if (this.branches.has(branchId))
      throw new RangeError("The collaboration branch already exists.");
    if (!this.revisions.has(fromRevision))
      throw new RangeError("The source revision does not exist.");
    const branch: MutableBranch = {
      branchId,
      headRevision: fromRevision,
      policy: normalizeBranchPolicy(policy)
    };
    this.branches.set(branchId, branch);
    return this.branchSnapshot(branch);
  }

  branch(branchId: string): CollaborationBranch | undefined {
    const value = this.branches.get(branchId);
    return value === undefined ? undefined : this.branchSnapshot(value);
  }

  proposal(proposalId: string): CollaborationProposal | undefined {
    const value = this.proposals.get(proposalId);
    return value === undefined ? undefined : proposalSnapshot(value);
  }

  revision(revision: string): CollaborationRevision | undefined {
    return this.revisions.get(revision);
  }

  intervening(
    headRevision: string,
    baseRevision: string
  ): readonly CollaborationRevision[] | undefined {
    const values: CollaborationRevision[] = [];
    let cursor: string | undefined = headRevision;
    while (continueTraversal(cursor, baseRevision)) {
      const revision = this.revisions.get(cursor);
      if (revision === undefined) return undefined;
      values.push(revision);
      cursor = revision.parentRevision;
    }
    return completedIntervening(cursor, baseRevision, values);
  }

  nowIso(): string {
    return this.clock.now().toISOString();
  }

  idempotencyKey(actor: CollaborationActorContext, operation: string, key: string): string {
    return `${actor.tenantId}\u0000${actor.actorId}\u0000${operation}\u0000${key}`;
  }

  idempotencyConflict(): CollaborationResult {
    return {
      diagnostics: [
        {
          code: CollaborationErrorCode.IdempotencyConflict,
          messageKey: "collaboration.idempotency.conflict"
        }
      ],
      status: CollaborationStatus.Invalid
    };
  }

  private initialRevision(
    document: JsonObject,
    identity: { readonly revision: string; readonly sequence: number }
  ): CollaborationRevision {
    return Object.freeze({
      actorId: "system",
      actorType: CollaborationActorType.Automation,
      branchId: "main",
      changedPaths: Object.freeze(["/"]),
      committedAt: this.nowIso(),
      correlationId: "initial",
      document,
      removedPaths: Object.freeze([]),
      revision: identity.revision,
      sequence: identity.sequence,
      tenantId: this.tenantId
    });
  }

  private branchSnapshot(value: MutableBranch): CollaborationBranch {
    return Object.freeze({
      branchId: value.branchId,
      headRevision: value.headRevision,
      policy: value.policy,
      ...(value.publishedRevision === undefined
        ? {}
        : { publishedRevision: value.publishedRevision })
    });
  }
}

function continueTraversal(cursor: string | undefined, baseRevision: string): cursor is string {
  return [cursor !== undefined, cursor !== baseRevision].every(Boolean);
}

function completedIntervening(
  cursor: string | undefined,
  baseRevision: string,
  values: CollaborationRevision[]
): readonly CollaborationRevision[] | undefined {
  return cursor === baseRevision ? values.reverse() : undefined;
}

export function proposalSnapshot(value: MutableProposal): CollaborationProposal {
  return Object.freeze({
    approvals: Object.freeze(value.approvals.map((approval) => Object.freeze({ ...approval }))),
    authorId: value.authorId,
    baseRevision: value.baseRevision,
    branchId: value.branchId,
    candidateRevision: value.candidateRevision,
    comments: Object.freeze(value.comments.map((comment) => Object.freeze({ ...comment }))),
    createdAt: value.createdAt,
    ...(value.expiresAt === undefined ? {} : { expiresAt: value.expiresAt }),
    proposalId: value.proposalId,
    rebased: value.rebased,
    status: value.status
  });
}
