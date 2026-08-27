import { canonicalJson } from "@unislang/unifold-export";

import {
  StudioDiagnosticCode,
  StudioExportStatus,
  type StudioDiagnostic,
  type StudioExportResult,
  type StudioProposalRequest,
  type StudioRequestOptions
} from "./types.js";
import type { JsonObject } from "@unislang/unifold-contracts";

export function proposalRequest(
  document: unknown,
  options: StudioRequestOptions,
  signal: AbortSignal
): StudioProposalRequest {
  return {
    document,
    prompt: options.prompt,
    ...(options.selectedNodeId === undefined ? {} : { selectedNodeId: options.selectedNodeId }),
    signal
  };
}

export function jsonObject(value: unknown): JsonObject | undefined {
  if (Object.prototype.toString.call(value) !== "[object Object]") return undefined;
  return value as JsonObject;
}

export function requireJsonObject(value: unknown): JsonObject {
  const candidate = jsonObject(value);
  if (candidate === undefined) throw new TypeError("The Studio candidate must be a JSON object.");
  return candidate;
}

export function diagnostic(code: StudioDiagnosticCode): StudioDiagnostic {
  return { code, message: diagnosticMessage(code) };
}

export function staleDiagnostic(): StudioDiagnostic {
  return diagnostic(StudioDiagnosticCode.StaleResult);
}

export function safeMessage(error: unknown, code: StudioDiagnosticCode): string {
  if (error instanceof Error && error.name === "AbortError") {
    return diagnosticMessage(StudioDiagnosticCode.Cancelled);
  }
  return diagnosticMessage(code);
}

export function updateDiagnostics(
  diagnostics: readonly { readonly message: string }[]
): readonly StudioDiagnostic[] {
  if (diagnostics.length === 0) return [diagnostic(StudioDiagnosticCode.UpdateRejected)];
  return diagnostics.map(() => diagnostic(StudioDiagnosticCode.UpdateRejected));
}

export function unavailableExport(
  code = StudioDiagnosticCode.ExportUnavailable
): StudioExportResult {
  return {
    diagnostics: [diagnostic(code)],
    status: StudioExportStatus.Unavailable
  };
}

export function sameDocument(left: unknown, right: unknown): boolean {
  return canonicalJson(left) === canonicalJson(right);
}

function diagnosticMessage(code: StudioDiagnosticCode): string {
  return `The Studio operation stopped: ${code}.`;
}
