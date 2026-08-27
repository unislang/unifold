import {
  AI_MUTABLE_ROOTS,
  AI_SUPPORTED_OPERATIONS,
  JsonPatchOperationType,
  UiPatchApprovalStatus,
  UiPatchDiagnosticCode,
  UiPatchRisk,
  type UiPatchDiagnostic,
  type UiPatchProposal
} from "./types.js";
import { effectiveUiPatchRisk } from "./risk.js";

const unsafeTokens = new Set(["__proto__", "constructor", "prototype"]);
const supportedOperations = new Set<JsonPatchOperationType>(AI_SUPPORTED_OPERATIONS);

export function proposalPolicyDiagnostics(
  proposal: UiPatchProposal,
  revision: string,
  hash: string,
  approval: UiPatchApprovalStatus = UiPatchApprovalStatus.Pending
): readonly UiPatchDiagnostic[] {
  return [
    ...baseDiagnostics(proposal, revision, hash),
    ...operationDiagnostics(proposal),
    ...approvalDiagnostics(effectiveUiPatchRisk(proposal), approval)
  ];
}

function baseDiagnostics(
  proposal: UiPatchProposal,
  revision: string,
  hash: string
): readonly UiPatchDiagnostic[] {
  const diagnostics: UiPatchDiagnostic[] = [];
  if (proposal.baseRevision !== revision) {
    diagnostics.push(diagnostic(UiPatchDiagnosticCode.BaseRevisionMismatch, "/baseRevision"));
  }
  if (proposal.baseHash !== hash) {
    diagnostics.push(diagnostic(UiPatchDiagnosticCode.BaseHashMismatch, "/baseHash"));
  }
  return diagnostics;
}

function operationDiagnostics(proposal: UiPatchProposal): readonly UiPatchDiagnostic[] {
  const diagnostics = proposal.operations.flatMap(inspectOperation);
  if (!hasRevisionTest(proposal)) {
    diagnostics.push(diagnostic(UiPatchDiagnosticCode.MissingRevisionTest, "/operations/0"));
  }
  if (!hasRevisionChange(proposal)) {
    diagnostics.push(diagnostic(UiPatchDiagnosticCode.MissingRevisionChange, "/operations"));
  }
  return diagnostics;
}

function inspectOperation(operation: UiPatchProposal["operations"][number], index: number) {
  const path = `/operations/${index}`;
  return [
    ...unsupportedOperation(operation.op, path),
    ...forbiddenPath(operation.op, operation.path, path),
    ...unsupportedFrom(operation.from, path)
  ];
}

function unsupportedOperation(op: JsonPatchOperationType, path: string): UiPatchDiagnostic[] {
  if (supportedOperations.has(op)) return [];
  return [diagnostic(UiPatchDiagnosticCode.UnsupportedOperation, path)];
}

function forbiddenPath(
  operation: JsonPatchOperationType,
  value: string,
  path: string
): UiPatchDiagnostic[] {
  const safe = [
    isMutablePath(operation, value),
    !hasUnsafeToken(value),
    !targetsStableId(value)
  ].every(Boolean);
  if (safe) return [];
  return [diagnostic(UiPatchDiagnosticCode.ForbiddenPath, `${path}/path`)];
}

function unsupportedFrom(from: string | undefined, path: string): UiPatchDiagnostic[] {
  if (from === undefined) return [];
  return [diagnostic(UiPatchDiagnosticCode.UnsupportedOperation, `${path}/from`)];
}

function approvalDiagnostics(
  risk: UiPatchRisk,
  approval: UiPatchApprovalStatus
): readonly UiPatchDiagnostic[] {
  if (risk === UiPatchRisk.Presentation) return [];
  if (approval === UiPatchApprovalStatus.Approved) return [];
  return [diagnostic(UiPatchDiagnosticCode.ApprovalRequired, "/risk")];
}

function hasRevisionTest(proposal: UiPatchProposal): boolean {
  const first = proposal.operations[0];
  if (first === undefined) return false;
  const actual = [first.op, first.path, first.value];
  const expected = [JsonPatchOperationType.Test, "/revision", proposal.baseRevision];
  return JSON.stringify(actual) === JSON.stringify(expected);
}

function hasRevisionChange(proposal: UiPatchProposal): boolean {
  return proposal.operations.some((operation) =>
    isRevisionChange(operation, proposal.baseRevision)
  );
}

function isRevisionChange(
  operation: UiPatchProposal["operations"][number],
  baseRevision: string
): boolean {
  const actual = [operation.op, operation.path, operation.value === baseRevision];
  const expected = [JsonPatchOperationType.Replace, "/revision", false];
  return JSON.stringify(actual) === JSON.stringify(expected);
}

function isMutablePath(operation: JsonPatchOperationType, path: string): boolean {
  if (path === "/revision") return true;
  if (path === "/semantics") return operation === JsonPatchOperationType.Add;
  return AI_MUTABLE_ROOTS.some((root) => root !== "/revision" && path.startsWith(`${root}/`));
}

function hasUnsafeToken(path: string): boolean {
  return path.split("/").some((token) => unsafeTokens.has(token));
}

function targetsStableId(path: string): boolean {
  return path.endsWith("/id");
}

function diagnostic(code: UiPatchDiagnosticCode, path: string): UiPatchDiagnostic {
  return { code, message: diagnosticMessage(code), path };
}

function diagnosticMessage(code: UiPatchDiagnosticCode): string {
  return `UI patch policy rejected the proposal: ${code}.`;
}
