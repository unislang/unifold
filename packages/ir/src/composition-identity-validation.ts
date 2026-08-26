import { errorDiagnostic } from "./diagnostics.js";
import { DiagnosticCode } from "./enums.js";
import { isPlainObject } from "./json-safety.js";
import type { CompilerDiagnostic } from "./types.js";

interface IdentityValidationState {
  readonly claimedSources: Set<string>;
  readonly diagnostics: CompilerDiagnostic[];
  readonly nodeIds: Pick<ReadonlyMap<string, string>, "has">;
}

export function validateCompositionIdentityAliases(
  value: unknown,
  nodeComponents: ReadonlyMap<string, string>,
  diagnostics: CompilerDiagnostic[]
): void {
  if (value === undefined) return;
  const path = "/compositionManifest/identityAliases";
  if (!isPlainObject(value)) return report(path, diagnostics);
  const state: IdentityValidationState = {
    claimedSources: new Set(),
    diagnostics,
    nodeIds: nodeComponents
  };
  Object.entries(value).forEach(([targetId, sourceId]) =>
    validateAlias(targetId, sourceId, path, state)
  );
}

function validateAlias(
  targetId: string,
  sourceId: unknown,
  path: string,
  state: IdentityValidationState
): void {
  reportUnless(state.nodeIds.has(targetId), path, state.diagnostics);
  if (!isNonEmptyString(sourceId)) return reportInvalidSource(path, state);
  reportUnless(targetId !== sourceId, path, state.diagnostics);
  reportUnless(!state.nodeIds.has(sourceId), path, state.diagnostics);
  reportUnless(!state.claimedSources.has(sourceId), path, state.diagnostics);
  state.claimedSources.add(sourceId);
}

function reportInvalidSource(path: string, state: IdentityValidationState): void {
  report(path, state.diagnostics);
}

function reportUnless(valid: boolean, path: string, diagnostics: CompilerDiagnostic[]): void {
  if (!valid) report(path, diagnostics);
}

function report(path: string, diagnostics: CompilerDiagnostic[]): void {
  diagnostics.push(
    errorDiagnostic(DiagnosticCode.InvalidCompositionManifest, "Invalid alias.", path)
  );
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}
