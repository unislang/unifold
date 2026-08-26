import {
  CoreCatalogName,
  CoreCatalogVersion,
  UiContractSchemaUri,
  UiSchemaVersion,
  type UiDocument
} from "@unislang/unifold-contracts";
import {
  validateJsonUiProfileDocument,
  type JsonUiProfileDiagnostic
} from "@unislang/unifold-jsonui";

import { errorDiagnostic } from "./diagnostics.js";
import { validateCompositionManifest } from "./composition-validation.js";
import { validateDerivedRules } from "./derived-rule-validation.js";
import { validateErrorSummaryTargets } from "./error-summary-validation.js";
import { validateNodeEventBindings } from "./event-binding-validation.js";
import { CoreComponentType, DiagnosticCode } from "./enums.js";
import { isJsonSafe, isPlainObject } from "./json-safety.js";
import { validateMachineDefinitions } from "./machine-validation.js";
import { validateNodeProperties } from "./property-validation.js";
import { validateSemanticGraph } from "./semantic-validation.js";
import {
  validateNodeStoreBinding,
  validateStoreDefinitions,
  type StoreValidationIndex
} from "./store-validation.js";
import type { CompilerDiagnostic } from "./types.js";

const SUPPORTED_COMPONENTS = new Set<string>(Object.values(CoreComponentType));

interface ValidationState {
  readonly diagnostics: CompilerDiagnostic[];
  readonly nodeComponents: Map<string, string>;
  readonly nodeIds: Set<string>;
  readonly stores: StoreValidationIndex;
}

export function validateUiDocument(value: unknown): {
  readonly diagnostics: readonly CompilerDiagnostic[];
  readonly document?: UiDocument;
} {
  const diagnostics: CompilerDiagnostic[] = [];
  if (!isJsonSafe(value)) return invalidJson(diagnostics);
  if (!isPlainObject(value)) return invalidDocument(diagnostics);
  return validateProfiledDocument(value, diagnostics);
}

function validateProfiledDocument(
  value: Readonly<Record<string, unknown>>,
  diagnostics: CompilerDiagnostic[]
): { readonly diagnostics: readonly CompilerDiagnostic[]; readonly document?: UiDocument } {
  if (addProfileDiagnostics(value, diagnostics)) return validationResult(value, diagnostics);
  validateDocumentFields(value, diagnostics);
  validateSemanticGraph(value["semantics"], diagnostics);
  const stores = validateStoreDefinitions(value["stores"], diagnostics);
  const state: ValidationState = {
    diagnostics,
    nodeComponents: new Map(),
    nodeIds: new Set(),
    stores
  };
  validateNode(value["view"], "/view", state);
  validateErrorSummaryTargets(value["view"], state.nodeComponents, state.nodeIds, diagnostics);
  validateCompositionManifest(value["compositionManifest"], state.nodeComponents, diagnostics);
  validateMachineDefinitions(value["machines"], state.nodeIds, diagnostics);
  validateDerivedRules(value["rules"], state.nodeComponents, diagnostics);
  return validationResult(value, diagnostics);
}

function validationResult(
  value: Readonly<Record<string, unknown>>,
  diagnostics: CompilerDiagnostic[]
): { readonly diagnostics: readonly CompilerDiagnostic[]; readonly document?: UiDocument } {
  if (diagnostics.length > 0) return { diagnostics };
  return { diagnostics, document: value as unknown as UiDocument };
}

function invalidJson(diagnostics: CompilerDiagnostic[]): {
  readonly diagnostics: readonly CompilerDiagnostic[];
} {
  diagnostics.push(
    errorDiagnostic(
      DiagnosticCode.InvalidJson,
      "The document must contain only finite, acyclic JSON values.",
      ""
    )
  );
  return { diagnostics };
}

function invalidDocument(diagnostics: CompilerDiagnostic[]): {
  readonly diagnostics: readonly CompilerDiagnostic[];
} {
  diagnostics.push(
    errorDiagnostic(DiagnosticCode.InvalidDocument, "The UI document must be a JSON object.", "")
  );
  return { diagnostics };
}

function validateDocumentFields(
  value: Readonly<Record<string, unknown>>,
  diagnostics: CompilerDiagnostic[]
): void {
  expectValue(value["$schema"], UiContractSchemaUri.Version1, "/$schema", diagnostics);
  expectValue(value["schemaVersion"], UiSchemaVersion.Version1, "/schemaVersion", diagnostics);
  expectString(value["id"], "/id", diagnostics);
  expectString(value["revision"], "/revision", diagnostics);
  validateCatalog(value["catalog"], diagnostics);
}

function addProfileDiagnostics(
  value: Readonly<Record<string, unknown>>,
  diagnostics: CompilerDiagnostic[]
): boolean {
  const result = validateJsonUiProfileDocument(value);
  result.diagnostics.forEach((diagnostic) => diagnostics.push(profileDiagnostic(diagnostic)));
  return !result.compatible;
}

function profileDiagnostic(diagnostic: JsonUiProfileDiagnostic): CompilerDiagnostic {
  const code =
    diagnostic.feature === undefined
      ? DiagnosticCode.InvalidProfile
      : DiagnosticCode.UnsupportedJsonUiFeature;
  return errorDiagnostic(code, diagnostic.message, diagnostic.path);
}

function validateCatalog(value: unknown, diagnostics: CompilerDiagnostic[]): void {
  if (!expectObject(value, "/catalog", diagnostics, DiagnosticCode.InvalidCatalog)) return;
  expectValue(
    value["name"],
    CoreCatalogName.UnifoldCore,
    "/catalog/name",
    diagnostics,
    DiagnosticCode.InvalidCatalog
  );
  expectValue(
    value["version"],
    CoreCatalogVersion.Version1,
    "/catalog/version",
    diagnostics,
    DiagnosticCode.InvalidCatalog
  );
}

function validateNode(value: unknown, path: string, state: ValidationState): void {
  if (!expectObject(value, path, state.diagnostics, DiagnosticCode.InvalidNode)) return;
  const id = validateNodeId(value["id"], `${path}/id`, state);
  const component = validateComponent(value["$comp"], `${path}/$comp`, id, state.diagnostics);
  recordNodeComponent(id, component, state);
  validateNodeEventBindings(value["events"], component, `${path}/events`, state.diagnostics);
  validateNodeStoreBinding(value, component, path, state.stores, state.diagnostics);
  validateNodeProperties(value, component, path, state.diagnostics);
  validateChildren(value["$children"], `${path}/$children`, state);
}

function recordNodeComponent(
  id: string | undefined,
  component: string | undefined,
  state: ValidationState
): void {
  if (id === undefined) return;
  if (component === undefined) return;
  state.nodeComponents.set(id, component);
}

function validateNodeId(value: unknown, path: string, state: ValidationState): string | undefined {
  if (!expectString(value, path, state.diagnostics)) return undefined;
  if (state.nodeIds.has(value)) addDuplicateDiagnostic(value, path, state.diagnostics);
  state.nodeIds.add(value);
  return value;
}

function addDuplicateDiagnostic(
  nodeId: string,
  path: string,
  diagnostics: CompilerDiagnostic[]
): void {
  diagnostics.push(
    errorDiagnostic(
      DiagnosticCode.DuplicateNodeId,
      `Node id "${nodeId}" is already defined.`,
      path,
      nodeId
    )
  );
}

function validateComponent(
  value: unknown,
  path: string,
  nodeId: string | undefined,
  diagnostics: CompilerDiagnostic[]
): string | undefined {
  if (!expectString(value, path, diagnostics)) return undefined;
  if (!SUPPORTED_COMPONENTS.has(value))
    diagnostics.push(
      errorDiagnostic(
        DiagnosticCode.UnsupportedComponent,
        `Component "${value}" is not supported by this JsonUI profile.`,
        path,
        nodeId
      )
    );
  return value;
}

function validateChildren(value: unknown, path: string, state: ValidationState): void {
  if (value === undefined) return;
  if (!Array.isArray(value)) return addInvalidChildren(path, state.diagnostics);
  value.forEach((child, index) => validateNode(child, `${path}/${index}`, state));
}

function addInvalidChildren(path: string, diagnostics: CompilerDiagnostic[]): void {
  diagnostics.push(
    errorDiagnostic(DiagnosticCode.InvalidNode, "$children must be an array of JsonUI nodes.", path)
  );
}

function expectObject(
  value: unknown,
  path: string,
  diagnostics: CompilerDiagnostic[],
  code: DiagnosticCode
): value is Readonly<Record<string, unknown>> {
  if (isPlainObject(value)) return true;
  diagnostics.push(errorDiagnostic(code, "Expected a JSON object.", path));
  return false;
}

function expectString(
  value: unknown,
  path: string,
  diagnostics: CompilerDiagnostic[]
): value is string {
  if (typeof value === "string" && value.length > 0) return true;
  diagnostics.push(
    errorDiagnostic(DiagnosticCode.MissingRequiredProperty, "Expected a non-empty string.", path)
  );
  return false;
}

function expectValue(
  value: unknown,
  expected: string,
  path: string,
  diagnostics: CompilerDiagnostic[],
  code: DiagnosticCode = DiagnosticCode.InvalidSchemaVersion
): void {
  if (value === expected) return;
  diagnostics.push(errorDiagnostic(code, `Expected "${expected}".`, path));
}
