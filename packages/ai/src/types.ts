import type { JsonObject, JsonValue } from "@unislang/unifold-contracts";
import type { UnifoldApplicationPort, UnifoldApplicationUpdateResult } from "@unislang/unifold";
import type { LanguageModel } from "ai";

export enum JsonPatchOperationType {
  Add = "add",
  Copy = "copy",
  Move = "move",
  Remove = "remove",
  Replace = "replace",
  Test = "test"
}

export enum UiPatchRisk {
  Behavior = "behavior",
  Data = "data",
  ExternalEffect = "external-effect",
  Interaction = "interaction",
  Presentation = "presentation"
}

export enum UiPatchApprovalStatus {
  Approved = "approved",
  Pending = "pending"
}

export enum UiPatchEvaluationStatus {
  Accepted = "accepted",
  Rejected = "rejected",
  ReviewRequired = "review-required"
}

export enum UiPatchCommitStatus {
  Applied = "applied",
  Rejected = "rejected",
  ReviewRequired = "review-required"
}

export enum UiPatchDiagnosticCode {
  ApprovalRequired = "approval-required",
  BaseHashMismatch = "base-hash-mismatch",
  BaseRevisionMismatch = "base-revision-mismatch",
  CompilationFailed = "compilation-failed",
  ForbiddenPath = "forbidden-path",
  InvalidProposal = "invalid-proposal",
  MissingRevisionChange = "missing-revision-change",
  MissingRevisionTest = "missing-revision-test",
  PatchFailed = "patch-failed",
  UnsupportedOperation = "unsupported-operation"
}

export interface UiJsonPatchOperation extends JsonObject {
  readonly from?: string;
  readonly op: JsonPatchOperationType;
  readonly path: string;
  readonly value?: JsonValue;
}

export interface UiPatchProposal extends JsonObject {
  readonly baseHash: string;
  readonly baseRevision: string;
  readonly expectedOutcomes: readonly string[];
  readonly intentSummary: string;
  readonly operations: readonly UiJsonPatchOperation[];
  readonly proposalId: string;
  readonly requestedChecks: readonly string[];
  readonly risk: UiPatchRisk;
}

export interface UiPatchDiagnostic {
  readonly code: UiPatchDiagnosticCode;
  readonly message: string;
  readonly path: string;
}

export interface UiPatchEvaluationResult {
  readonly candidate?: unknown;
  readonly diagnostics: readonly UiPatchDiagnostic[];
  readonly status: UiPatchEvaluationStatus;
}

export interface EvaluateUiPatchProposalOptions {
  readonly approval?: UiPatchApprovalStatus;
  readonly document: unknown;
  readonly proposal: unknown;
}

export interface CommitUiPatchProposalOptions {
  readonly application: UnifoldApplicationPort;
  readonly approval?: UiPatchApprovalStatus;
  readonly proposal: unknown;
}

export interface UiPatchCommitResult {
  readonly evaluation: UiPatchEvaluationResult;
  readonly status: UiPatchCommitStatus;
  readonly update?: UnifoldApplicationUpdateResult;
}

export interface GenerateUiPatchProposalOptions {
  readonly abortSignal?: AbortSignal;
  readonly catalogSummary: string;
  readonly document: unknown;
  readonly model: LanguageModel;
  readonly prompt: string;
  readonly selectedNodeId?: string;
  readonly system?: string;
}
