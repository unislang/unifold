import { DiagnosticSeverity, type DiagnosticCode } from "./enums.js";
import type { CompilerDiagnostic } from "./types.js";

export function errorDiagnostic(
  code: DiagnosticCode,
  message: string,
  path: string,
  nodeId?: string
): CompilerDiagnostic {
  const base = { code, message, path, severity: DiagnosticSeverity.Error };
  return nodeId === undefined ? base : { ...base, nodeId };
}
