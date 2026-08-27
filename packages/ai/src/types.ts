import type { JsonObject, JsonValue } from "@unislang/unifold-contracts";
import type {
  CatalogPropertyDescriptor,
  ComponentDefinition,
  ComponentDefinitionDocument
} from "@unislang/unifold-catalog";
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

export const MAXIMUM_AI_CONTEXT_BYTES = 262_144;
export const MAXIMUM_AI_CONTEXT_DEFINITIONS = 128;
export const MAXIMUM_AI_CONTEXT_PROPERTIES = 128;
export const MAXIMUM_AI_PATCH_OPERATIONS = 32;
export const AI_MUTABLE_ROOTS = ["/compositions", "/revision", "/semantics", "/view"] as const;
export const AI_SUPPORTED_OPERATIONS = [
  JsonPatchOperationType.Add,
  JsonPatchOperationType.Remove,
  JsonPatchOperationType.Replace,
  JsonPatchOperationType.Test
] as const;

export enum UiAiContextVersion {
  Version1 = "1.0.0"
}

export enum UiAiContextStatus {
  Ready = "ready",
  Rejected = "rejected"
}

export enum UiAiRedactionStrategy {
  OmitSensitiveProperties = "omit-sensitive-properties"
}

export enum UiAiContextDiagnosticCode {
  CatalogMismatch = "catalog-mismatch",
  ContextBytesExceeded = "context-bytes-exceeded",
  DefinitionLimitExceeded = "definition-limit-exceeded",
  DuplicateDefinition = "duplicate-definition",
  InvalidDefinition = "invalid-definition",
  InvalidDocument = "invalid-document",
  PropertyLimitExceeded = "property-limit-exceeded",
  UnknownComponent = "unknown-component",
  UnsupportedDefinitionVersion = "unsupported-definition-version"
}

export interface UiAiContextDiagnostic {
  readonly code: UiAiContextDiagnosticCode;
  readonly message: string;
  readonly path: string;
}

export interface UiAiContext {
  readonly catalog: UiAiCatalogContext;
  readonly document: JsonValue;
  readonly policy: UiAiOperationPolicyContext;
  readonly redaction: UiAiRedactionStrategy;
  readonly version: UiAiContextVersion;
}

export interface UiAiCatalogContext {
  readonly definitions: readonly UiAiDefinitionContext[];
  readonly name: string;
  readonly schemaVersion: string;
  readonly version: string;
}

export interface UiAiDefinitionContext {
  readonly accessibility: ComponentDefinition["accessibility"];
  readonly behaviors: readonly string[];
  readonly commonCapabilities: ComponentDefinition["commonCapabilities"];
  readonly componentType: string;
  readonly constraints?: ComponentDefinition["catalogDescriptor"]["constraints"];
  readonly control?: Omit<NonNullable<ComponentDefinition["control"]>, "valueSchema">;
  readonly privacy: ComponentDefinition["privacy"];
  readonly properties: readonly UiAiPropertyContext[];
  readonly purpose: string;
  readonly semanticAttachmentPoints: ComponentDefinition["semanticAttachmentPoints"];
  readonly status: ComponentDefinition["status"];
  readonly tagName: string;
  readonly version: string;
}

export type UiAiPropertyContext = Omit<CatalogPropertyDescriptor, "defaultValue">;

export interface UiAiOperationPolicyContext {
  readonly maximumOperations: number;
  readonly mutableRoots: typeof AI_MUTABLE_ROOTS;
  readonly supportedOperations: typeof AI_SUPPORTED_OPERATIONS;
}

export interface BuildUiAiContextOptions {
  readonly componentDefinitions: ComponentDefinitionDocument;
  readonly document: unknown;
}

export interface ReadyUiAiContextResult {
  readonly context: UiAiContext;
  readonly diagnostics: readonly [];
  readonly status: UiAiContextStatus.Ready;
}

export interface RejectedUiAiContextResult {
  readonly diagnostics: readonly UiAiContextDiagnostic[];
  readonly status: UiAiContextStatus.Rejected;
}

export type BuildUiAiContextResult = ReadyUiAiContextResult | RejectedUiAiContextResult;

export class UiAiContextError extends Error {
  constructor(readonly diagnostics: readonly UiAiContextDiagnostic[]) {
    super(diagnostics[0]?.message ?? "AI context construction failed.");
    this.name = "UiAiContextError";
  }
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

export enum UiPatchRequestedCheck {
  Accessibility = "accessibility",
  Compiler = "compiler",
  StaticExport = "static-export"
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
  RequestedCheckFailed = "requested-check-failed",
  StableIdChanged = "stable-id-changed",
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
  readonly requestedChecks: readonly UiPatchRequestedCheck[];
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
  readonly componentDefinitions: ComponentDefinitionDocument;
  readonly document: unknown;
  readonly model: LanguageModel;
  readonly prompt: string;
  readonly selectedNodeId?: string;
  readonly system?: string;
}
