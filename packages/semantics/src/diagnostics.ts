import { SemanticDiagnosticSeverity, type SemanticDiagnosticCode } from "./enums.js";
import type { SemanticDiagnostic } from "./types.js";

export function semanticError(
  code: SemanticDiagnosticCode,
  path: string,
  message: string
): SemanticDiagnostic {
  return { code, message, path, severity: SemanticDiagnosticSeverity.Error };
}
