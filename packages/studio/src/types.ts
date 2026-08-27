import type { JsonObject } from "@unislang/unifold-contracts";
import type { DevtoolsDocumentDiff } from "@unislang/unifold-devtools";
import type { PortableJsonExportResult, StaticHtmlExportResult } from "@unislang/unifold-export";
import type {
  UiPatchApprovalStatus,
  UiPatchDiagnostic,
  UiPatchEvaluationResult,
  UiPatchProposal
} from "@unislang/unifold-ai/evaluation";
import type { UnifoldApplicationPort, UnifoldApplicationUpdateResult } from "@unislang/unifold";

export enum StudioSessionState {
  Applied = "applied",
  Applying = "applying",
  Disposed = "disposed",
  Failed = "failed",
  Generating = "generating",
  Idle = "idle",
  PreviewReady = "preview-ready",
  ReviewRequired = "review-required"
}

export enum StudioDiagnosticCode {
  Cancelled = "cancelled",
  Disposed = "disposed",
  EvaluationFailed = "evaluation-failed",
  ExportFailed = "export-failed",
  ExportUnavailable = "export-unavailable",
  InvalidCandidate = "invalid-candidate",
  PreviewFailed = "preview-failed",
  ProposalFailed = "proposal-failed",
  StaleResult = "stale-result",
  UpdateRejected = "update-rejected"
}

export enum StudioExportStatus {
  Exported = "exported",
  Unavailable = "unavailable"
}

export interface StudioDiagnostic {
  readonly code: StudioDiagnosticCode;
  readonly message: string;
}

export interface StudioProposalRequest {
  readonly document: unknown;
  readonly prompt: string;
  readonly selectedNodeId?: string;
  readonly signal: AbortSignal;
}

export interface StudioProposalClient {
  propose(request: StudioProposalRequest): Promise<unknown>;
}

export interface StudioProposalEvaluator {
  evaluate(options: {
    readonly approval?: UiPatchApprovalStatus;
    readonly document: unknown;
    readonly proposal: unknown;
  }): Promise<UiPatchEvaluationResult>;
}

export interface StudioPreviewHandle {
  dispose(): void;
}

export interface StudioPreviewPort {
  open(candidate: unknown): Promise<StudioPreviewHandle> | StudioPreviewHandle;
}

export interface StudioExportBundle {
  readonly portable: PortableJsonExportResult;
  readonly staticHtml: StaticHtmlExportResult;
}

export interface StudioExportedResult {
  readonly bundle: StudioExportBundle;
  readonly diagnostics: readonly StudioDiagnostic[];
  readonly status: StudioExportStatus.Exported;
}

export interface StudioUnavailableExportResult {
  readonly diagnostics: readonly StudioDiagnostic[];
  readonly status: StudioExportStatus.Unavailable;
}

export type StudioExportResult = StudioExportedResult | StudioUnavailableExportResult;

export interface StudioSessionSnapshot {
  readonly candidate?: JsonObject;
  readonly diagnostics: readonly (StudioDiagnostic | UiPatchDiagnostic)[];
  readonly diff?: DevtoolsDocumentDiff;
  readonly proposal?: UiPatchProposal;
  readonly state: StudioSessionState;
  readonly update?: UnifoldApplicationUpdateResult;
}

export interface StudioSessionOptions {
  readonly application: Pick<UnifoldApplicationPort, "authored" | "update">;
  readonly evaluator: StudioProposalEvaluator;
  readonly preview: StudioPreviewPort;
  readonly proposalClient: StudioProposalClient;
}

export interface StudioRequestOptions {
  readonly prompt: string;
  readonly selectedNodeId?: string;
}
