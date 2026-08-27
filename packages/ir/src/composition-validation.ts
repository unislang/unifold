import {
  UiCompositionExportKind,
  UI_COMPOSITION_IDENTITY_VERSION,
  UiCompositionManifestVersion,
  UiCompositionSelectionKind
} from "@unislang/unifold-contracts";

import { errorDiagnostic } from "./diagnostics.js";
import { validateCompositionIdentityAliases } from "./composition-identity-validation.js";
import { validateCompositionProvenance } from "./composition-provenance-validation.js";
import { CoreComponentType, DiagnosticCode } from "./enums.js";
import { isPlainObject } from "./json-safety.js";
import type { CompilerDiagnostic } from "./types.js";

interface ManifestValidationState {
  readonly diagnostics: CompilerDiagnostic[];
  readonly instanceRoots: Map<string, string>;
  readonly nodeComponents: ReadonlyMap<string, string>;
  readonly provenanceInstances: Map<string, string>;
}

type ExportValidator = (
  value: Readonly<Record<string, unknown>>,
  path: string,
  state: ManifestValidationState
) => void;

const exportValidators: Readonly<Record<UiCompositionExportKind, ExportValidator>> = {
  [UiCompositionExportKind.Command]: validateCommandExport,
  [UiCompositionExportKind.Event]: validateEventExport,
  [UiCompositionExportKind.Selection]: validateSelectionExport
};

export function validateCompositionManifest(
  value: unknown,
  nodeComponents: ReadonlyMap<string, string>,
  diagnostics: CompilerDiagnostic[]
): void {
  if (value === undefined) return;
  if (!isPlainObject(value)) return reportManifestObject(diagnostics);
  const state = createState(nodeComponents, diagnostics);
  expectValue(
    value["contractVersion"],
    UiCompositionManifestVersion.Version1,
    "/compositionManifest/contractVersion",
    state
  );
  validateIdentityVersion(value["identityVersion"], state);
  validateCompositionIdentityAliases(value["identityAliases"], nodeComponents, diagnostics);
  validateInstances(value["instances"], state);
  validateCompositionProvenance(value["nodeProvenanceById"], state);
}

function validateIdentityVersion(value: unknown, state: ManifestValidationState): void {
  if (value === undefined) return;
  expectValue(
    value,
    UI_COMPOSITION_IDENTITY_VERSION,
    "/compositionManifest/identityVersion",
    state
  );
}

function createState(
  nodeComponents: ReadonlyMap<string, string>,
  diagnostics: CompilerDiagnostic[]
): ManifestValidationState {
  return {
    diagnostics,
    instanceRoots: new Map(),
    nodeComponents,
    provenanceInstances: new Map()
  };
}

function validateInstances(value: unknown, state: ManifestValidationState): void {
  if (!Array.isArray(value))
    return reportInvalid("/compositionManifest/instances", "Expected an instance array.", state);
  value.forEach((instance, index) => validateInstance(instance, index, state));
}

function validateInstance(value: unknown, index: number, state: ManifestValidationState): void {
  const path = `/compositionManifest/instances/${index}`;
  if (!isPlainObject(value))
    return reportInvalid(path, "Expected a composition instance object.", state);
  const instanceId = expectString(value["instanceId"], `${path}/instanceId`, state);
  const rootNodeId = expectString(value["rootNodeId"], `${path}/rootNodeId`, state);
  expectString(value["definitionName"], `${path}/definitionName`, state);
  expectString(value["definitionVersion"], `${path}/definitionVersion`, state);
  expectString(value["definitionSourcePointer"], `${path}/definitionSourcePointer`, state);
  expectString(value["instanceSourcePointer"], `${path}/instanceSourcePointer`, state);
  validateInstanceAncestry(value["ancestry"], instanceId, `${path}/ancestry`, state);
  validateInstanceIdentity(instanceId, rootNodeId, path, state);
  validateExports(value["exports"], `${path}/exports`, state);
}

function validateInstanceAncestry(
  value: unknown,
  instanceId: string | undefined,
  path: string,
  state: ManifestValidationState
): void {
  if (!isAncestry(value)) return reportInvalid(path, "Expected non-empty ancestry IDs.", state);
  validateInstanceAncestryOwner(value, instanceId, path, state);
}

function validateInstanceAncestryOwner(
  value: readonly string[],
  instanceId: string | undefined,
  path: string,
  state: ManifestValidationState
): void {
  if (instanceId === undefined) return;
  if (value.at(-1) !== instanceId)
    reportInvalid(path, "Ancestry must end with the instance ID.", state);
}

function isAncestry(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every(isNonEmptyString);
}

function validateInstanceIdentity(
  instanceId: string | undefined,
  rootNodeId: string | undefined,
  path: string,
  state: ManifestValidationState
): void {
  if (instanceId === undefined || rootNodeId === undefined) return;
  recordInstance(instanceId, rootNodeId, path, state);
  validateCompositionRoot(rootNodeId, path, state);
}

function recordInstance(
  instanceId: string,
  rootNodeId: string,
  path: string,
  state: ManifestValidationState
): void {
  if (state.instanceRoots.has(instanceId))
    reportInvalid(`${path}/instanceId`, `Duplicate composition instance: ${instanceId}.`, state);
  state.instanceRoots.set(instanceId, rootNodeId);
}

function validateCompositionRoot(
  rootNodeId: string,
  path: string,
  state: ManifestValidationState
): void {
  validateNodeTarget(rootNodeId, `${path}/rootNodeId`, state);
  if (state.nodeComponents.get(rootNodeId) === CoreComponentType.Composition) return;
  reportInvalid(
    `${path}/rootNodeId`,
    "Composition root must target a Composition node.",
    state,
    rootNodeId
  );
}

function validateExports(value: unknown, path: string, state: ManifestValidationState): void {
  if (!isPlainObject(value)) return reportExport(path, "Expected an export object.", state);
  Object.entries(value).forEach(([alias, descriptor]) => {
    validateExport(descriptor, `${path}/${alias}`, state);
  });
}

function validateExport(value: unknown, path: string, state: ManifestValidationState): void {
  if (!isPlainObject(value)) return reportExport(path, "Expected an export descriptor.", state);
  const kind = value["kind"];
  if (!isExportKind(kind))
    return reportExport(`${path}/kind`, "Unknown composition export kind.", state);
  expectString(value["localId"], `${path}/localId`, state, DiagnosticCode.InvalidCompositionExport);
  const nodeId = expectString(
    value["nodeId"],
    `${path}/nodeId`,
    state,
    DiagnosticCode.InvalidCompositionExport
  );
  validateExportTarget(nodeId, path, state);
  exportValidators[kind](value, path, state);
}

function validateExportTarget(
  nodeId: string | undefined,
  path: string,
  state: ManifestValidationState
): void {
  if (nodeId === undefined) return;
  validateNodeTarget(nodeId, `${path}/nodeId`, state, DiagnosticCode.InvalidCompositionExport);
}

function validateSelectionExport(
  value: Readonly<Record<string, unknown>>,
  path: string,
  state: ManifestValidationState
): void {
  const selection = value["selection"];
  if (!isSelectionKind(selection))
    return reportExport(`${path}/selection`, "Unknown selection kind.", state);
  validateControlSelection(selection, value["nodeId"], path, state);
}

function validateControlSelection(
  selection: UiCompositionSelectionKind,
  nodeId: unknown,
  path: string,
  state: ManifestValidationState
): void {
  if (selection !== UiCompositionSelectionKind.ControlValue) return;
  validateControlTarget(nodeId, path, state);
}

function validateControlTarget(
  nodeId: unknown,
  path: string,
  state: ManifestValidationState
): void {
  if (typeof nodeId !== "string") return;
  if (isControlComponent(state.nodeComponents.get(nodeId))) return;
  reportExport(
    `${path}/nodeId`,
    "Control-value selection must target a control node.",
    state,
    nodeId
  );
}

function isControlComponent(value: string | undefined): boolean {
  return controlComponents.has(value as CoreComponentType);
}

const controlComponents = new Set<CoreComponentType>([
  CoreComponentType.Accordion,
  CoreComponentType.Checkbox,
  CoreComponentType.CheckboxGroup,
  CoreComponentType.Combobox,
  CoreComponentType.DateField,
  CoreComponentType.MultiSelect,
  CoreComponentType.NumberField,
  CoreComponentType.RadioGroup,
  CoreComponentType.SearchField,
  CoreComponentType.Select,
  CoreComponentType.Switch,
  CoreComponentType.Tabs,
  CoreComponentType.TextArea,
  CoreComponentType.TextField
]);

function validateEventExport(
  value: Readonly<Record<string, unknown>>,
  path: string,
  state: ManifestValidationState
): void {
  const eventType = value["eventType"];
  if (eventType !== undefined)
    expectString(eventType, `${path}/eventType`, state, DiagnosticCode.InvalidCompositionExport);
}

function validateCommandExport(
  value: Readonly<Record<string, unknown>>,
  path: string,
  state: ManifestValidationState
): void {
  expectString(
    value["commandType"],
    `${path}/commandType`,
    state,
    DiagnosticCode.InvalidCompositionExport
  );
}

function validateNodeTarget(
  nodeId: string,
  path: string,
  state: ManifestValidationState,
  code: DiagnosticCode = DiagnosticCode.InvalidCompositionManifest
): void {
  if (state.nodeComponents.has(nodeId)) return;
  state.diagnostics.push(
    errorDiagnostic(code, `Unknown composition target node: ${nodeId}.`, path, nodeId)
  );
}

function expectString(
  value: unknown,
  path: string,
  state: ManifestValidationState,
  code: DiagnosticCode = DiagnosticCode.InvalidCompositionManifest
): string | undefined {
  if (isNonEmptyString(value)) return value;
  state.diagnostics.push(errorDiagnostic(code, "Expected a non-empty string.", path));
  return undefined;
}

function expectValue(
  value: unknown,
  expected: string,
  path: string,
  state: ManifestValidationState
): void {
  if (value === expected) return;
  reportInvalid(path, `Expected ${expected}.`, state);
}

function isExportKind(value: unknown): value is UiCompositionExportKind {
  return Object.values(UiCompositionExportKind).includes(value as UiCompositionExportKind);
}

function isSelectionKind(value: unknown): value is UiCompositionSelectionKind {
  return Object.values(UiCompositionSelectionKind).includes(value as UiCompositionSelectionKind);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function reportManifestObject(diagnostics: CompilerDiagnostic[]): void {
  diagnostics.push(
    errorDiagnostic(
      DiagnosticCode.InvalidCompositionManifest,
      "Expected a composition manifest object.",
      "/compositionManifest"
    )
  );
}

function reportInvalid(
  path: string,
  message: string,
  state: ManifestValidationState,
  nodeId?: string
): void {
  state.diagnostics.push(
    errorDiagnostic(DiagnosticCode.InvalidCompositionManifest, message, path, nodeId)
  );
}

function reportExport(
  path: string,
  message: string,
  state: ManifestValidationState,
  nodeId?: string
): void {
  state.diagnostics.push(
    errorDiagnostic(DiagnosticCode.InvalidCompositionExport, message, path, nodeId)
  );
}
