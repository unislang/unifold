import type { CompositionDiagnosticCode } from "./enums.js";
import type { CompositionDiagnostic } from "./types.js";

export function compositionError(
  code: CompositionDiagnosticCode,
  path: string,
  message: string
): CompositionDiagnostic {
  return { code, message, path };
}
