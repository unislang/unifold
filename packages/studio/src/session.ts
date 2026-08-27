import { UiPatchApprovalStatus, UiPatchEvaluationStatus } from "@unislang/unifold-ai/evaluation";
import { createDocumentDiff } from "@unislang/unifold-devtools";
import {
  createPortableJsonExport,
  createStaticHtmlExport,
  UnifoldExportStatus
} from "@unislang/unifold-export";
import { UnifoldApplicationUpdateStatus } from "@unislang/unifold";

import { createStudioSessionActor, StudioSessionEventType } from "./session-machine.js";
import {
  diagnostic,
  jsonObject,
  proposalRequest,
  requireJsonObject,
  safeMessage,
  sameDocument,
  staleDiagnostic,
  unavailableExport,
  updateDiagnostics
} from "./session-support.js";
import {
  StudioDiagnosticCode,
  StudioExportStatus,
  StudioSessionState,
  type StudioExportResult,
  type StudioPreviewHandle,
  type StudioRequestOptions,
  type StudioSessionOptions,
  type StudioSessionSnapshot
} from "./types.js";
import type { JsonObject } from "@unislang/unifold-contracts";
import type {
  UiPatchApprovalStatus as ApprovalStatus,
  UiPatchEvaluationResult,
  UiPatchProposal
} from "@unislang/unifold-ai/evaluation";

export class UnifoldStudioSession {
  private readonly actor = createStudioSessionActor();
  private approval: ApprovalStatus | undefined;
  private controller?: AbortController;
  private data: Omit<StudioSessionSnapshot, "state"> = { diagnostics: [] };
  private operation = 0;
  private preview: StudioPreviewHandle | undefined;

  constructor(private readonly options: StudioSessionOptions) {}

  get snapshot(): StudioSessionSnapshot {
    return Object.freeze({
      ...this.data,
      state: this.actor.getSnapshot().value as StudioSessionState
    });
  }

  subscribe(listener: (snapshot: StudioSessionSnapshot) => void): { unsubscribe(): void } {
    return this.actor.subscribe(() => listener(this.snapshot));
  }

  async request(options: StudioRequestOptions): Promise<StudioSessionSnapshot> {
    this.requireActive();
    const operation = this.beginRequest();
    const document = this.options.application.authored;
    try {
      const proposal = await this.options.proposalClient.propose(
        proposalRequest(document, options, this.requireController().signal)
      );
      if (!this.isCurrent(operation)) return this.snapshot;
      const evaluation = await this.options.evaluator.evaluate({ document, proposal });
      return this.finishEvaluation(proposal, evaluation, operation, document);
    } catch (error) {
      return this.finishFailure(error, operation);
    }
  }

  async approve(): Promise<StudioSessionSnapshot> {
    this.requireState(StudioSessionState.ReviewRequired);
    const proposal = this.requireProposal();
    const approval = UiPatchApprovalStatus.Approved;
    const operation = this.beginEvaluation(approval);
    const document = this.options.application.authored;
    try {
      const evaluation = await this.options.evaluator.evaluate({
        approval,
        document,
        proposal
      });
      return this.finishEvaluation(proposal, evaluation, operation, document);
    } catch (error) {
      return this.finishFailure(error, operation, StudioDiagnosticCode.EvaluationFailed);
    }
  }

  async apply(): Promise<StudioSessionSnapshot> {
    this.requireState(StudioSessionState.PreviewReady);
    const operation = this.nextOperation();
    this.actor.send({ type: StudioSessionEventType.Apply });
    const proposal = this.requireProposal();
    const document = this.options.application.authored;
    try {
      const evaluation = await this.evaluateProposal(document, proposal);
      if (!this.isCurrent(operation)) return this.snapshot;
      return this.applyEvaluation(evaluation, document);
    } catch (error) {
      return this.finishFailure(error, operation, StudioDiagnosticCode.EvaluationFailed);
    }
  }

  async export(): Promise<StudioExportResult> {
    if (this.currentState() !== StudioSessionState.Applied) return unavailableExport();
    const authored = this.options.application.authored;
    const [portable, staticHtml] = await Promise.all([
      createPortableJsonExport(authored),
      createStaticHtmlExport(authored)
    ]);
    if (!successfulExports(portable, staticHtml)) {
      return unavailableExport(StudioDiagnosticCode.ExportFailed);
    }
    return {
      bundle: { portable, staticHtml },
      diagnostics: [],
      status: StudioExportStatus.Exported
    };
  }

  cancel(): StudioSessionSnapshot {
    this.requireActive();
    this.nextOperation();
    this.controller?.abort();
    this.disposePreview();
    this.fail(diagnostic(StudioDiagnosticCode.Cancelled));
    return this.snapshot;
  }

  dispose(): void {
    if (this.currentState() === StudioSessionState.Disposed) return;
    this.nextOperation();
    this.controller?.abort();
    this.disposePreview();
    this.actor.send({ type: StudioSessionEventType.Dispose });
    this.actor.stop();
  }

  private beginRequest(): number {
    this.controller?.abort();
    this.disposePreview();
    this.controller = new AbortController();
    this.approval = undefined;
    this.data = { diagnostics: [] };
    this.actor.send({ type: StudioSessionEventType.Request });
    return this.nextOperation();
  }

  private beginEvaluation(approval: ApprovalStatus): number {
    this.approval = approval;
    this.data = { ...this.data, diagnostics: [] };
    this.actor.send({ type: StudioSessionEventType.Request });
    return this.nextOperation();
  }

  private async finishEvaluation(
    proposal: unknown,
    evaluation: UiPatchEvaluationResult,
    operation: number,
    document: unknown
  ): Promise<StudioSessionSnapshot> {
    if (!this.isCurrent(operation)) return this.snapshot;
    if (evaluation.status === UiPatchEvaluationStatus.ReviewRequired) {
      return this.requireReview(proposal, evaluation);
    }
    return this.finishDecidedEvaluation(proposal, evaluation, operation, document);
  }

  private finishDecidedEvaluation(
    proposal: unknown,
    evaluation: UiPatchEvaluationResult,
    operation: number,
    document: unknown
  ): Promise<StudioSessionSnapshot> | StudioSessionSnapshot {
    if (evaluation.status === UiPatchEvaluationStatus.Rejected) {
      return this.fail(...evaluation.diagnostics);
    }
    return this.openPreview(proposal, evaluation, operation, document);
  }

  private requireReview(
    proposal: unknown,
    evaluation: UiPatchEvaluationResult
  ): StudioSessionSnapshot {
    this.data = {
      diagnostics: evaluation.diagnostics,
      proposal: proposal as UiPatchProposal
    };
    this.actor.send({ type: StudioSessionEventType.Review });
    return this.snapshot;
  }

  private async openPreview(
    proposal: unknown,
    evaluation: UiPatchEvaluationResult,
    operation: number,
    base: unknown
  ): Promise<StudioSessionSnapshot> {
    try {
      const candidate = requireJsonObject(evaluation.candidate);
      const baseDocument = requireJsonObject(base);
      if (!this.hasSameLiveDocument(baseDocument)) return this.fail(staleDiagnostic());
      const diff = await createDocumentDiff(baseDocument, candidate);
      const preview = await this.options.preview.open(candidate);
      return this.installPreview(proposal, candidate, diff, preview, operation, baseDocument);
    } catch (error) {
      return this.finishFailure(error, operation, StudioDiagnosticCode.PreviewFailed);
    }
  }

  private installPreview(
    proposal: unknown,
    candidate: JsonObject,
    diff: Awaited<ReturnType<typeof createDocumentDiff>>,
    preview: StudioPreviewHandle,
    operation: number,
    base: JsonObject
  ): StudioSessionSnapshot {
    if (!this.isCurrent(operation)) {
      preview.dispose();
      return this.snapshot;
    }
    if (!this.hasSameLiveDocument(base)) {
      preview.dispose();
      return this.fail(staleDiagnostic());
    }
    this.preview = preview;
    this.data = { candidate, diagnostics: [], diff, proposal: proposal as UiPatchProposal };
    this.actor.send({ type: StudioSessionEventType.Previewed });
    return this.snapshot;
  }

  private applyEvaluation(
    evaluation: UiPatchEvaluationResult,
    base: unknown
  ): StudioSessionSnapshot {
    if (evaluation.status !== UiPatchEvaluationStatus.Accepted) {
      return this.fail(...evaluation.diagnostics);
    }
    return this.applyCandidate(evaluation.candidate, base);
  }

  private applyCandidate(value: unknown, base: unknown): StudioSessionSnapshot {
    const candidate = jsonObject(value);
    if (candidate === undefined)
      return this.fail(diagnostic(StudioDiagnosticCode.InvalidCandidate));
    return this.applyJsonCandidate(candidate, base);
  }

  private applyJsonCandidate(candidate: JsonObject, base: unknown): StudioSessionSnapshot {
    if (!this.hasSameLiveDocument(base)) return this.fail(staleDiagnostic());
    const update = this.options.application.update(candidate);
    if (update.status !== UnifoldApplicationUpdateStatus.Applied) {
      return this.fail(...updateDiagnostics(update.diagnostics));
    }
    this.disposePreview();
    this.data = { ...this.data, candidate, diagnostics: [], update };
    this.actor.send({ type: StudioSessionEventType.Applied });
    return this.snapshot;
  }

  private finishFailure(
    error: unknown,
    operation: number,
    code = StudioDiagnosticCode.ProposalFailed
  ): StudioSessionSnapshot {
    if (!this.isCurrent(operation)) return this.snapshot;
    return this.fail({ code, message: safeMessage(error, code) });
  }

  private fail(...diagnostics: StudioSessionSnapshot["diagnostics"]): StudioSessionSnapshot {
    this.disposePreview();
    this.data = { diagnostics };
    this.actor.send({ type: StudioSessionEventType.Failed });
    return this.snapshot;
  }

  private requireProposal(): UiPatchProposal {
    if (this.data.proposal === undefined) throw new Error("No Studio proposal is available.");
    return this.data.proposal;
  }

  private requireController(): AbortController {
    if (this.controller === undefined) throw new Error("No Studio request is active.");
    return this.controller;
  }

  private requireState(expected: StudioSessionState): void {
    this.requireActive();
    if (this.currentState() !== expected) throw new Error(`Studio state must be ${expected}.`);
  }

  private requireActive(): void {
    if (this.currentState() === StudioSessionState.Disposed) {
      throw new Error(diagnostic(StudioDiagnosticCode.Disposed).message);
    }
  }

  private currentState(): StudioSessionState {
    return this.actor.getSnapshot().value as StudioSessionState;
  }

  private nextOperation(): number {
    this.operation += 1;
    return this.operation;
  }

  private isCurrent(operation: number): boolean {
    return this.operation === operation && this.currentState() !== StudioSessionState.Disposed;
  }

  private hasSameLiveDocument(base: unknown): boolean {
    return sameDocument(base, this.options.application.authored);
  }

  private evaluateProposal(document: unknown, proposal: UiPatchProposal) {
    return this.options.evaluator.evaluate({
      ...(this.approval === undefined ? {} : { approval: this.approval }),
      document,
      proposal
    });
  }

  private disposePreview(): void {
    this.preview?.dispose();
    this.preview = undefined;
  }
}

function successfulExports(
  portable: { readonly status: UnifoldExportStatus },
  staticHtml: { readonly status: UnifoldExportStatus }
): boolean {
  return (
    portable.status === UnifoldExportStatus.Exported &&
    staticHtml.status === UnifoldExportStatus.Exported
  );
}
