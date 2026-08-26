import type { JsonObject, JsonValue } from "@unislang/unifold-contracts";

export enum CollaborationProtocolVersion {
  Version1 = "1.0.0"
}

export enum CollaborationSchemaUri {
  Version1 = "https://schemas.unifold.org/collaboration/1.0/schema.json"
}

export enum CollaborationOperation {
  Approve = "proposal.approve",
  Comment = "proposal.comment",
  Presence = "presence.update",
  Propose = "proposal.submit",
  Publish = "revision.publish",
  Undo = "revision.undo"
}

export enum CollaborationCapability {
  Approve = "collaboration.approve",
  Comment = "collaboration.comment",
  Presence = "collaboration.presence",
  Propose = "collaboration.propose",
  Publish = "collaboration.publish",
  Undo = "collaboration.undo"
}

export enum CollaborationActorType {
  Ai = "ai",
  Automation = "automation",
  Human = "human",
  Import = "import",
  Migration = "migration"
}

export enum CollaborationPatchOperationType {
  Add = "add",
  Copy = "copy",
  Move = "move",
  Remove = "remove",
  Replace = "replace",
  Test = "test"
}

export enum CollaborationStatus {
  Accepted = "accepted",
  Conflict = "conflict",
  Denied = "denied",
  Gap = "gap",
  Invalid = "invalid",
  NotFound = "not-found",
  Replayed = "replayed",
  ReviewRequired = "review-required"
}

export enum CollaborationErrorCode {
  ApprovalExpired = "approval-expired",
  ApprovalStale = "approval-stale",
  BaseNotAncestor = "base-not-ancestor",
  BranchNotFound = "branch-not-found",
  CapabilityDenied = "capability-denied",
  IdempotencyConflict = "idempotency-conflict",
  InvalidPatch = "invalid-patch",
  InvalidRequest = "invalid-request",
  ProposalNotFound = "proposal-not-found",
  PublishNotApproved = "publish-not-approved",
  RealtimeGap = "realtime-gap",
  ReviewerDenied = "reviewer-denied",
  RevisionNotFound = "revision-not-found",
  SchemaRejected = "schema-rejected",
  SeparationOfDuties = "separation-of-duties"
}

export enum CollaborationConflictKind {
  Accessibility = "accessibility",
  AncestorOverlap = "ancestor-overlap",
  BaseNotAncestor = "base-not-ancestor",
  DeleteEdit = "delete-edit",
  Machine = "machine",
  Policy = "policy",
  SamePath = "same-path",
  Semantics = "semantics"
}

export enum CollaborationProposalStatus {
  Committed = "committed",
  Pending = "pending",
  Stale = "stale"
}

export enum CollaborationEventType {
  ApprovalRecorded = "approval-recorded",
  CommentAdded = "comment-added",
  PresenceChanged = "presence-changed",
  ProposalCreated = "proposal-created",
  RevisionCommitted = "revision-committed",
  RevisionPublished = "revision-published"
}

export interface CollaborationActorContext {
  readonly actorId: string;
  readonly actorType: CollaborationActorType;
  readonly capabilities: readonly CollaborationCapability[];
  readonly tenantId: string;
}

export interface CollaborationRequestMetadata extends JsonObject {
  readonly correlationId: string;
  readonly operation: CollaborationOperation;
  readonly protocolVersion: CollaborationProtocolVersion;
  readonly requestId: string;
}

export interface CollaborationPatchOperation extends JsonObject {
  readonly from?: string;
  readonly op: CollaborationPatchOperationType;
  readonly path: string;
  readonly value?: JsonValue;
}

export interface CollaborationSubmitProposalRequest extends CollaborationRequestMetadata {
  readonly affectedIds: readonly string[];
  readonly baseRevision: string;
  readonly branchId: string;
  readonly causationId?: string;
  readonly idempotencyKey: string;
  readonly intent: string;
  readonly operation: CollaborationOperation.Propose;
  readonly operations: readonly CollaborationPatchOperation[];
  readonly proposalId: string;
}

export interface CollaborationApproveRequest extends CollaborationRequestMetadata {
  readonly expectedRevision: string;
  readonly operation: CollaborationOperation.Approve;
  readonly proposalId: string;
}

export interface CollaborationCommentRequest extends CollaborationRequestMetadata {
  readonly body: string;
  readonly operation: CollaborationOperation.Comment;
  readonly proposalId: string;
}

export interface CollaborationPublishRequest extends CollaborationRequestMetadata {
  readonly branchId: string;
  readonly operation: CollaborationOperation.Publish;
  readonly revision: string;
}

export interface CollaborationUndoRequest extends CollaborationRequestMetadata {
  readonly branchId: string;
  readonly idempotencyKey: string;
  readonly operation: CollaborationOperation.Undo;
  readonly targetRevision: string;
}

export interface CollaborationPresenceRequest extends CollaborationRequestMetadata {
  readonly branchId: string;
  readonly cursor?: JsonObject;
  readonly draft: boolean;
  readonly expiresInMs: number;
  readonly operation: CollaborationOperation.Presence;
  readonly selectedId?: string;
}

export type CollaborationRequest =
  | CollaborationApproveRequest
  | CollaborationCommentRequest
  | CollaborationPresenceRequest
  | CollaborationPublishRequest
  | CollaborationSubmitProposalRequest
  | CollaborationUndoRequest;

export interface CollaborationDiagnostic extends JsonObject {
  readonly code: CollaborationErrorCode;
  readonly messageKey: string;
  readonly path?: string;
}

export interface CollaborationConflict extends JsonObject {
  readonly baseRevision: string;
  readonly currentPath: string;
  readonly currentRevision: string;
  readonly kind: CollaborationConflictKind;
  readonly proposalPath: string;
}

export interface CollaborationResult<TValue extends JsonValue = JsonValue> {
  readonly conflicts?: readonly CollaborationConflict[];
  readonly diagnostics?: readonly CollaborationDiagnostic[];
  readonly status: CollaborationStatus;
  readonly value?: TValue;
}

export interface CollaborationRevision extends JsonObject {
  readonly actorId: string;
  readonly actorType: CollaborationActorType;
  readonly branchId: string;
  readonly changedPaths: readonly string[];
  readonly committedAt: string;
  readonly compensatesRevision?: string;
  readonly correlationId: string;
  readonly document: JsonObject;
  readonly parentRevision?: string;
  readonly proposalId?: string;
  readonly removedPaths: readonly string[];
  readonly revision: string;
  readonly sequence: number;
  readonly tenantId: string;
}

export interface CollaborationApproval extends JsonObject {
  readonly actorId: string;
  readonly approvedAt: string;
  readonly revision: string;
}

export interface CollaborationComment extends JsonObject {
  readonly actorId: string;
  readonly body: string;
  readonly commentId: string;
  readonly createdAt: string;
}

export interface CollaborationProposal extends JsonObject {
  readonly approvals: readonly CollaborationApproval[];
  readonly authorId: string;
  readonly baseRevision: string;
  readonly branchId: string;
  readonly candidateRevision: string;
  readonly comments: readonly CollaborationComment[];
  readonly createdAt: string;
  readonly expiresAt?: string;
  readonly proposalId: string;
  readonly rebased: boolean;
  readonly status: CollaborationProposalStatus;
}

export interface CollaborationBranchPolicy extends JsonObject {
  readonly approvalTtlMs: number;
  readonly protected: boolean;
  readonly requiredApprovals: number;
  readonly reviewerIds: readonly string[];
  readonly separateAuthorAndReviewer: boolean;
}

export interface CollaborationBranch extends JsonObject {
  readonly branchId: string;
  readonly headRevision: string;
  readonly policy: CollaborationBranchPolicy;
  readonly publishedRevision?: string;
}

export interface CollaborationPresence extends JsonObject {
  readonly actorId: string;
  readonly actorType: CollaborationActorType;
  readonly branchId: string;
  readonly cursor?: JsonObject;
  readonly draft: boolean;
  readonly expiresAt: string;
  readonly selectedId?: string;
  readonly tenantId: string;
}

export interface CollaborationEvent extends JsonObject {
  readonly actorId: string;
  readonly branchId?: string;
  readonly correlationId: string;
  readonly occurredAt: string;
  readonly payload: JsonObject;
  readonly sequence: number;
  readonly tenantId: string;
  readonly type: CollaborationEventType;
}

export interface CollaborationEventBatch extends JsonObject {
  readonly latestSequence: number;
  readonly messages: readonly CollaborationEvent[];
  readonly oldestAvailableSequence: number;
}

export interface CollaborationValidationPort {
  validate(document: JsonObject): readonly CollaborationDiagnostic[];
}

export interface CollaborationClockPort {
  now(): Date;
}

export interface ReferenceCollaborationOptions {
  readonly clock?: CollaborationClockPort;
  readonly eventCapacity?: number;
  readonly initialDocument: JsonObject;
  readonly mainBranchPolicy?: CollaborationBranchPolicy;
  readonly tenantId: string;
  readonly validation: CollaborationValidationPort;
}
