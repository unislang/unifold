import { UnifoldCliStatus } from "./enums.js";
import type { UnifoldCliDiagnostic, UnifoldCliResult } from "./types.js";

export function cliFailure(
  message: string,
  diagnostics: readonly UnifoldCliDiagnostic[]
): UnifoldCliResult {
  return { diagnostics, message, status: UnifoldCliStatus.Failed };
}

export function cliSuccess(message: string): UnifoldCliResult {
  return { diagnostics: [], message, status: UnifoldCliStatus.Succeeded };
}
