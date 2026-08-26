import { prepareUnifoldDocument, UnifoldPreparationStatus } from "@unislang/unifold";
import { applyPatch, type Operation } from "rfc6902";

import { fingerprintJson } from "./fingerprint.js";
import { proposalPolicyDiagnostics } from "./policy.js";
import { uiPatchProposalSchema } from "./schema.js";
import {
  UiPatchApprovalStatus,
  UiPatchDiagnosticCode,
  UiPatchEvaluationStatus,
  type EvaluateUiPatchProposalOptions,
  type UiPatchDiagnostic,
  type UiPatchEvaluationResult,
  type UiPatchProposal
} from "./types.js";

export async function evaluateUiPatchProposal(
  options: EvaluateUiPatchProposalOptions
): Promise<UiPatchEvaluationResult> {
  const parsed = uiPatchProposalSchema.safeParse(options.proposal);
  if (!parsed.success) return rejected(schemaDiagnostic(parsed.error.message));
  return evaluateParsed(parsed.data as UiPatchProposal, options);
}

async function evaluateParsed(
  proposal: UiPatchProposal,
  options: EvaluateUiPatchProposalOptions
): Promise<UiPatchEvaluationResult> {
  const revision = documentRevision(options.document);
  if (revision === undefined) return rejected(invalidDocumentDiagnostic());
  const hash = await fingerprintJson(options.document);
  const approval = approvalStatus(options.approval);
  const diagnostics = proposalPolicyDiagnostics(proposal, revision, hash, approval);
  if (diagnostics.length > 0) return policyResult(diagnostics);
  return applyAndCompile(options.document, proposal);
}

function applyAndCompile(document: unknown, proposal: UiPatchProposal): UiPatchEvaluationResult {
  const candidate = structuredClone(document);
  const results = applyPatch(candidate, proposal.operations as unknown as Operation[]);
  const failure = results.find((result) => result !== null);
  if (failure !== undefined) return rejected(patchDiagnostic(failure));
  const preparation = prepareUnifoldDocument(candidate);
  if (preparation.status === UnifoldPreparationStatus.Invalid) {
    return rejected(...compilerDiagnostics(preparation.diagnostics));
  }
  return { candidate, diagnostics: [], status: UiPatchEvaluationStatus.Accepted };
}

function policyResult(diagnostics: readonly UiPatchDiagnostic[]): UiPatchEvaluationResult {
  const review = diagnostics.some((item) => item.code === UiPatchDiagnosticCode.ApprovalRequired);
  return {
    diagnostics,
    status: review ? UiPatchEvaluationStatus.ReviewRequired : UiPatchEvaluationStatus.Rejected
  };
}

function documentRevision(document: unknown): string | undefined {
  if (!isObject(document)) return undefined;
  const revision = Reflect.get(document, "revision");
  return typeof revision === "string" ? revision : undefined;
}

function isObject(value: unknown): value is object {
  return value !== null && typeof value === "object";
}

function approvalStatus(value: UiPatchApprovalStatus | undefined): UiPatchApprovalStatus {
  return value ?? UiPatchApprovalStatus.Pending;
}

function schemaDiagnostic(message: string): UiPatchDiagnostic {
  return { code: UiPatchDiagnosticCode.InvalidProposal, message, path: "/" };
}

function invalidDocumentDiagnostic(): UiPatchDiagnostic {
  return schemaDiagnostic("The current document has no string revision.");
}

function patchDiagnostic(error: Error): UiPatchDiagnostic {
  return { code: UiPatchDiagnosticCode.PatchFailed, message: error.message, path: "/operations" };
}

function compilerDiagnostics(
  diagnostics: readonly { readonly message: string; readonly path: string }[]
): UiPatchDiagnostic[] {
  return diagnostics.map((item) => ({
    code: UiPatchDiagnosticCode.CompilationFailed,
    message: item.message,
    path: item.path
  }));
}

function rejected(...diagnostics: UiPatchDiagnostic[]): UiPatchEvaluationResult {
  return { diagnostics, status: UiPatchEvaluationStatus.Rejected };
}
