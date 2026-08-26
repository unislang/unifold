import { errorDiagnostic } from "./diagnostics.js";
import { DiagnosticCode } from "./enums.js";
import { isPlainObject } from "./json-safety.js";
import type { CompilerDiagnostic } from "./types.js";

interface CompositionProvenanceValidationState {
  readonly diagnostics: CompilerDiagnostic[];
  readonly instanceRoots: ReadonlyMap<string, string>;
  readonly nodeComponents: ReadonlyMap<string, string>;
  readonly provenanceInstances: Map<string, string>;
}

export function validateCompositionProvenance(
  value: unknown,
  state: CompositionProvenanceValidationState
): void {
  const path = "/compositionManifest/nodeProvenanceById";
  if (!isPlainObject(value)) return report(path, "Expected a provenance object.", state);
  Object.entries(value).forEach(([nodeId, provenance]) => {
    validateNodeProvenance(nodeId, provenance, `${path}/${nodeId}`, state);
  });
  validateInstanceRoots(state);
}

function validateNodeProvenance(
  nodeId: string,
  value: unknown,
  path: string,
  state: CompositionProvenanceValidationState
): void {
  validateNodeTarget(nodeId, path, state);
  if (!isPlainObject(value)) return report(path, "Expected a provenance descriptor.", state);
  const instanceId = validateRequiredFields(value, path, state);
  validateAncestry(value["ancestry"], instanceId, `${path}/ancestry`, state);
  validateOptionalFields(value, path, state);
  if (instanceId !== undefined) state.provenanceInstances.set(nodeId, instanceId);
}

function validateRequiredFields(
  value: Readonly<Record<string, unknown>>,
  path: string,
  state: CompositionProvenanceValidationState
): string | undefined {
  const instanceId = expectString(value["instanceId"], `${path}/instanceId`, state);
  ["localId", "definitionName", "definitionVersion", "instanceSourcePointer"].forEach((name) => {
    expectString(value[name], `${path}/${name}`, state);
  });
  return instanceId;
}

function validateOptionalFields(
  value: Readonly<Record<string, unknown>>,
  path: string,
  state: CompositionProvenanceValidationState
): void {
  ["definitionSourcePointer", "slotName", "slotSourcePointer"].forEach((name) => {
    const field = value[name];
    if (field !== undefined) expectString(field, `${path}/${name}`, state);
  });
}

function validateInstanceRoots(state: CompositionProvenanceValidationState): void {
  state.instanceRoots.forEach((rootNodeId, instanceId) => {
    if (state.provenanceInstances.get(rootNodeId) === instanceId) return;
    report(
      "/compositionManifest/nodeProvenanceById",
      `Missing root provenance for ${instanceId}.`,
      state,
      rootNodeId
    );
  });
}

function validateAncestry(
  value: unknown,
  instanceId: string | undefined,
  path: string,
  state: CompositionProvenanceValidationState
): void {
  if (!isStringArray(value)) return report(path, "Expected non-empty ancestry IDs.", state);
  validateAncestryOwner(value, instanceId, path, state);
}

function validateAncestryOwner(
  value: readonly string[],
  instanceId: string | undefined,
  path: string,
  state: CompositionProvenanceValidationState
): void {
  if (instanceId === undefined) return;
  if (value.at(-1) !== instanceId)
    report(path, "Ancestry must end with the owning instance ID.", state);
}

function validateNodeTarget(
  nodeId: string,
  path: string,
  state: CompositionProvenanceValidationState
): void {
  if (state.nodeComponents.has(nodeId)) return;
  report(path, `Unknown composition target node: ${nodeId}.`, state, nodeId);
}

function expectString(
  value: unknown,
  path: string,
  state: CompositionProvenanceValidationState
): string | undefined {
  if (isNonEmptyString(value)) return value;
  report(path, "Expected a non-empty string.", state);
  return undefined;
}

function isStringArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every(isNonEmptyString);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function report(
  path: string,
  message: string,
  state: CompositionProvenanceValidationState,
  nodeId?: string
): void {
  state.diagnostics.push(
    errorDiagnostic(DiagnosticCode.InvalidCompositionProvenance, message, path, nodeId)
  );
}
