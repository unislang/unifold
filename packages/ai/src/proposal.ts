import {
  prepareUnifoldDocument,
  UnifoldPreparationStatus,
  type PreparedUnifoldDocument
} from "@unislang/unifold";
import { getComponentDefinitionSidecar } from "@unislang/unifold-catalog";
import type { CoreComponentType } from "@unislang/unifold-contracts";
import { createStaticHtmlExport, UnifoldExportStatus } from "@unislang/unifold-export";
import { applyPatch, type Operation } from "rfc6902";

import { fingerprintJson } from "./fingerprint.js";
import { proposalPolicyDiagnostics } from "./policy.js";
import { proposalSafetyDiagnostic } from "./proposal-safety.js";
import { uiPatchProposalSchema } from "./schema.js";
import {
  UiPatchApprovalStatus,
  UiPatchDiagnosticCode,
  UiPatchEvaluationStatus,
  UiPatchRequestedCheck,
  type EvaluateUiPatchProposalOptions,
  type UiPatchDiagnostic,
  type UiPatchEvaluationResult,
  type UiPatchProposal
} from "./types.js";

export async function evaluateUiPatchProposal(
  options: EvaluateUiPatchProposalOptions
): Promise<UiPatchEvaluationResult> {
  const safetyDiagnostic = proposalSafetyDiagnostic(options.proposal);
  if (safetyDiagnostic !== undefined) return rejected(safetyDiagnostic);
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
  return evaluatePolicyAndCandidate(diagnostics, options.document, proposal);
}

async function evaluatePolicyAndCandidate(
  diagnostics: readonly UiPatchDiagnostic[],
  document: unknown,
  proposal: UiPatchProposal
): Promise<UiPatchEvaluationResult> {
  const hardFailures = diagnostics.filter(isHardPolicyFailure);
  if (hardFailures.length > 0) return policyResult(hardFailures);
  const candidate = await applyAndCompile(document, proposal);
  if (candidate.status !== UiPatchEvaluationStatus.Accepted) return candidate;
  return approvalResult(candidate, diagnostics);
}

function isHardPolicyFailure(diagnostic: UiPatchDiagnostic): boolean {
  return diagnostic.code !== UiPatchDiagnosticCode.ApprovalRequired;
}

function approvalResult(
  candidate: UiPatchEvaluationResult,
  diagnostics: readonly UiPatchDiagnostic[]
): UiPatchEvaluationResult {
  return diagnostics.length === 0 ? candidate : policyResult(diagnostics);
}

async function applyAndCompile(
  document: unknown,
  proposal: UiPatchProposal
): Promise<UiPatchEvaluationResult> {
  const candidate = structuredClone(document);
  const patchFailure = applyCandidatePatch(candidate, proposal);
  if (patchFailure !== undefined) return rejected(patchFailure);
  if (!preservesStableIds(document, candidate)) return rejected(stableIdDiagnostic());
  return compileAndCheckCandidate(candidate, proposal.requestedChecks);
}

function applyCandidatePatch(
  candidate: unknown,
  proposal: UiPatchProposal
): UiPatchDiagnostic | undefined {
  const results = applyPatch(candidate, proposal.operations as unknown as Operation[]);
  const failure = results.find((result) => result !== null);
  return failure === undefined ? undefined : patchDiagnostic(failure);
}

async function compileAndCheckCandidate(
  candidate: unknown,
  checks: readonly UiPatchRequestedCheck[]
): Promise<UiPatchEvaluationResult> {
  const preparation = prepareUnifoldDocument(candidate);
  if (preparation.status === UnifoldPreparationStatus.Invalid) {
    return rejected(...compilerDiagnostics(preparation.diagnostics));
  }
  const checkDiagnostics = await requestedCheckDiagnostics(
    candidate,
    preparation.prepared as PreparedUnifoldDocument,
    checks
  );
  if (checkDiagnostics.length > 0) return rejected(...checkDiagnostics);
  return { candidate, diagnostics: [], status: UiPatchEvaluationStatus.Accepted };
}

async function requestedCheckDiagnostics(
  candidate: unknown,
  prepared: PreparedUnifoldDocument,
  checks: readonly UiPatchRequestedCheck[]
): Promise<readonly UiPatchDiagnostic[]> {
  const requested = new Set(checks);
  const diagnostics: UiPatchDiagnostic[] = [];
  if (requested.has(UiPatchRequestedCheck.Accessibility)) {
    diagnostics.push(...accessibilityCheckDiagnostics(prepared));
  }
  if (requested.has(UiPatchRequestedCheck.StaticExport)) {
    diagnostics.push(...(await staticExportCheckDiagnostics(candidate)));
  }
  return diagnostics;
}

function accessibilityCheckDiagnostics(
  prepared: PreparedUnifoldDocument
): readonly UiPatchDiagnostic[] {
  const missing = Object.values(prepared.document.nodesById).find(
    (node) => getComponentDefinitionSidecar(node.componentType as CoreComponentType) === undefined
  );
  return missing === undefined
    ? []
    : [requestedCheckDiagnostic(UiPatchRequestedCheck.Accessibility)];
}

async function staticExportCheckDiagnostics(
  candidate: unknown
): Promise<readonly UiPatchDiagnostic[]> {
  const result = await createStaticHtmlExport(candidate);
  if (result.status === UnifoldExportStatus.Exported) return [];
  return [requestedCheckDiagnostic(UiPatchRequestedCheck.StaticExport)];
}

function requestedCheckDiagnostic(check: UiPatchRequestedCheck): UiPatchDiagnostic {
  return {
    code: UiPatchDiagnosticCode.RequestedCheckFailed,
    message: `The requested ${check} preflight failed.`,
    path: "/requestedChecks"
  };
}

function policyResult(diagnostics: readonly UiPatchDiagnostic[]): UiPatchEvaluationResult {
  const review = diagnostics.every((item) => item.code === UiPatchDiagnosticCode.ApprovalRequired);
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

function stableIdDiagnostic(): UiPatchDiagnostic {
  return {
    code: UiPatchDiagnosticCode.StableIdChanged,
    message: "The proposal removed or changed an existing stable ID.",
    path: "/operations"
  };
}

function preservesStableIds(current: unknown, candidate: unknown): boolean {
  const candidateIds = collectIds(candidate);
  return [...collectIds(current)].every((id) => candidateIds.has(id));
}

function collectIds(value: unknown): ReadonlySet<string> {
  const ids = new Set<string>();
  const pending = [value];
  while (pending.length > 0) inspectIdentityValue(pending.pop(), pending, ids);
  return ids;
}

function inspectIdentityValue(value: unknown, pending: unknown[], ids: Set<string>): void {
  if (Array.isArray(value)) {
    pending.push(...value);
    return;
  }
  if (isObject(value)) inspectIdentityRecord(value, pending, ids);
}

function inspectIdentityRecord(value: object, pending: unknown[], ids: Set<string>): void {
  const id = Reflect.get(value, "id");
  if (typeof id === "string") ids.add(id);
  pending.push(...Object.values(value));
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
