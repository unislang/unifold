import type { JsonObject } from "@unislang/unifold-contracts";

import { CompositionDiagnosticCode, LayoutExpansionStatus } from "./enums.js";
import { expandLayoutRoot } from "./layout-nodes.js";
import { validateLayoutJson, validateLayoutJsonAt } from "./layout-safety.js";
import { TrustedLayoutDefinitionRegistry } from "./layout-registry.js";
import { layoutVariableSourcePointers } from "./layout-source-pointers.js";
import { validateLayoutDocumentShape } from "./layout-validation.js";
import {
  addLayoutDiagnostic as add,
  isLayoutObject as isObject,
  rejectUnknownLayoutKeys as rejectUnknownKeys,
  resolveLayoutVariables
} from "./layout-values.js";
import type { CompositionDiagnostic, LayoutCollectionDefinition } from "./types.js";

export const LAYOUT_DOCUMENT_SCHEMA = "https://schemas.unifold.org/layout-document/1.0/schema.json";

export interface LayoutExpansionResult {
  readonly collectionsById?: Readonly<Record<string, LayoutCollectionDefinition>>;
  readonly diagnostics: readonly CompositionDiagnostic[];
  readonly document?: JsonObject;
  readonly sourcePointersByNodeId?: Readonly<Record<string, string>>;
  readonly status: LayoutExpansionStatus;
}

export interface LayoutExpansionOptions {
  readonly registry?: TrustedLayoutDefinitionRegistry;
}

interface SelectedLayoutDefinition {
  readonly definition: Readonly<Record<string, unknown>>;
  readonly path: string;
}

const layoutKeys = new Set(["layoutType", "template", "variables", "version"]);

export function expandLayoutDocument(
  value: unknown,
  options: LayoutExpansionOptions = {}
): LayoutExpansionResult {
  const document = asLayoutDocument(value);
  if (document === undefined) return { diagnostics: [], status: LayoutExpansionStatus.NotLayout };
  return expandKnownLayout(document, options);
}

function asLayoutDocument(value: unknown): Readonly<Record<string, unknown>> | undefined {
  if (!isObject(value)) return undefined;
  if (typeof value["layoutType"] !== "string") return undefined;
  return value;
}

function expandKnownLayout(
  document: Readonly<Record<string, unknown>>,
  options: LayoutExpansionOptions
): LayoutExpansionResult {
  const diagnostics: CompositionDiagnostic[] = [];
  if (!validateLayoutJson(document, diagnostics)) return invalid(diagnostics);
  return expandSafeLayout(document, options, diagnostics);
}

function expandSafeLayout(
  document: Readonly<Record<string, unknown>>,
  options: LayoutExpansionOptions,
  diagnostics: CompositionDiagnostic[]
): LayoutExpansionResult {
  const shapeDiagnostics = validateLayoutDocumentShape(document);
  if (shapeDiagnostics.length > 0) return invalid([...diagnostics, ...shapeDiagnostics]);
  const definitions = availableDefinitions(document, options, diagnostics);
  if (definitions === undefined) return invalid(diagnostics);
  return expandDefinitions(document, definitions, diagnostics);
}

function availableDefinitions(
  document: Readonly<Record<string, unknown>>,
  options: LayoutExpansionOptions,
  diagnostics: CompositionDiagnostic[]
): readonly SelectedLayoutDefinition[] | undefined {
  const local = localDefinitions(document["layouts"], diagnostics);
  const external = registryDefinitions(options.registry, diagnostics);
  if (local === undefined) return undefined;
  if (external === undefined) return undefined;
  return definitionCandidates(local, external);
}

function expandDefinitions(
  document: Readonly<Record<string, unknown>>,
  definitions: readonly SelectedLayoutDefinition[],
  diagnostics: CompositionDiagnostic[]
): LayoutExpansionResult {
  const selected = selectDefinition(document, definitions, diagnostics);
  if (selected === undefined) return invalid(diagnostics);
  return expandSelected(document, selected, diagnostics);
}

function expandSelected(
  document: Readonly<Record<string, unknown>>,
  selected: SelectedLayoutDefinition,
  diagnostics: CompositionDiagnostic[]
): LayoutExpansionResult {
  const variables = resolveLayoutVariables(selected.definition, document["variables"], diagnostics);
  if (variables === undefined) return invalid(diagnostics);
  return expandWithVariables(document, selected, variables, diagnostics);
}

function expandWithVariables(
  document: Readonly<Record<string, unknown>>,
  selected: SelectedLayoutDefinition,
  variables: Parameters<typeof expandLayoutRoot>[1],
  diagnostics: CompositionDiagnostic[]
): LayoutExpansionResult {
  const definitionPath = selected.path;
  const collectionsById: Record<string, LayoutCollectionDefinition> = {};
  const sourcePointers: Record<string, string> = {};
  const variablePointers = layoutVariableSourcePointers(
    selected.definition,
    document["variables"],
    definitionPath
  );
  const view = expandLayoutRoot(selected.definition["template"], variables, diagnostics, {
    collectionsById,
    rootPointer: `${definitionPath}/template`,
    sourcePointers,
    variablePointers
  });
  if (view === undefined) return invalid(diagnostics);
  if (diagnostics.length > 0) return invalid(diagnostics);
  return valid(document, view, sourcePointers, collectionsById);
}

function selectDefinition(
  document: Readonly<Record<string, unknown>>,
  definitions: readonly SelectedLayoutDefinition[],
  diagnostics: CompositionDiagnostic[]
): SelectedLayoutDefinition | undefined {
  const version = document["layoutVersion"];
  if (typeof version !== "string") return missingVersion(diagnostics);
  const matches = matchingDefinitions(document["layoutType"], version, definitions);
  return selectMatch(document["layoutType"], version, matches, diagnostics);
}

function matchingDefinitions(
  type: unknown,
  version: string,
  definitions: readonly SelectedLayoutDefinition[]
): readonly SelectedLayoutDefinition[] {
  return definitions.flatMap((item) => {
    if (!matchesLayout(item.definition, type, version)) return [];
    return [item];
  });
}

function matchesLayout(
  value: unknown,
  type: unknown,
  version: string
): value is Readonly<Record<string, unknown>> {
  if (!isObject(value)) return false;
  return value["layoutType"] === type && value["version"] === version;
}

function selectMatch(
  type: unknown,
  version: string,
  matches: readonly SelectedLayoutDefinition[],
  diagnostics: CompositionDiagnostic[]
): SelectedLayoutDefinition | undefined {
  if (matches.length !== 1) return unknownLayout(type, version, matches.length, diagnostics);
  const selected = matches[0] as SelectedLayoutDefinition;
  rejectUnknownKeys(selected.definition, layoutKeys, selected.path, diagnostics);
  return selected;
}

function localDefinitions(
  value: unknown,
  diagnostics: CompositionDiagnostic[]
): readonly unknown[] | undefined {
  if (value === undefined) return [];
  if (Array.isArray(value)) return value;
  missingDefinitions(diagnostics);
  return undefined;
}

function registryDefinitions(
  registry: TrustedLayoutDefinitionRegistry | undefined,
  diagnostics: CompositionDiagnostic[]
): readonly unknown[] | undefined {
  if (registry === undefined) return [];
  if (!(registry instanceof TrustedLayoutDefinitionRegistry)) {
    addRegistryDiagnostic(
      diagnostics,
      "Layout registry must be created by the trusted registry API."
    );
    return undefined;
  }
  return safeRegistryDefinitions(registry.snapshot(), diagnostics);
}

function safeRegistryDefinitions(
  definitions: readonly unknown[],
  diagnostics: CompositionDiagnostic[]
): readonly unknown[] | undefined {
  const valid = validateLayoutJsonAt(definitions, diagnostics, "/$layoutRegistry/definitions");
  return valid ? definitions : undefined;
}

function definitionCandidates(
  local: readonly unknown[],
  external: readonly unknown[]
): readonly SelectedLayoutDefinition[] {
  return [
    ...local.map((definition, index) => candidate(definition, `/layouts/${String(index)}`)),
    ...external.map((definition, index) =>
      candidate(definition, `/$layoutRegistry/definitions/${String(index)}`)
    )
  ];
}

function candidate(definition: unknown, path: string): SelectedLayoutDefinition {
  return { definition: isObject(definition) ? definition : {}, path };
}

function addRegistryDiagnostic(diagnostics: CompositionDiagnostic[], message: string): void {
  add(diagnostics, CompositionDiagnosticCode.InvalidLayout, "/$layoutRegistry", message);
}

function missingDefinitions(diagnostics: CompositionDiagnostic[]): LayoutExpansionResult {
  add(
    diagnostics,
    CompositionDiagnosticCode.InvalidLayout,
    "/layouts",
    "Layouts must be an array."
  );
  return invalid(diagnostics);
}

function missingVersion(diagnostics: CompositionDiagnostic[]): undefined {
  add(
    diagnostics,
    CompositionDiagnosticCode.InvalidLayout,
    "/layoutVersion",
    "Layout version is required."
  );
  return undefined;
}

function unknownLayout(
  type: unknown,
  version: string,
  count: number,
  diagnostics: CompositionDiagnostic[]
): undefined {
  add(
    diagnostics,
    CompositionDiagnosticCode.UnknownLayout,
    "/layoutType",
    `Expected one exact layout ${String(type)}@${version}; found ${String(count)}.`
  );
  return undefined;
}

function valid(
  source: Readonly<Record<string, unknown>>,
  view: JsonObject,
  sourcePointers: Readonly<Record<string, string>>,
  collectionsById: Readonly<Record<string, LayoutCollectionDefinition>>
): LayoutExpansionResult {
  return {
    collectionsById: sortedCollections(collectionsById),
    diagnostics: [],
    document: createUiDocument(source, view),
    sourcePointersByNodeId: sortedPointers(sourcePointers),
    status: LayoutExpansionStatus.Valid
  };
}

function sortedCollections(
  collections: Readonly<Record<string, LayoutCollectionDefinition>>
): Readonly<Record<string, LayoutCollectionDefinition>> {
  return Object.fromEntries(
    Object.entries(collections).sort(([left], [right]) => left.localeCompare(right))
  );
}

function sortedPointers(
  sourcePointers: Readonly<Record<string, string>>
): Readonly<Record<string, string>> {
  return Object.fromEntries(
    Object.entries(sourcePointers).sort(([left], [right]) => left.localeCompare(right))
  );
}

function createUiDocument(source: Readonly<Record<string, unknown>>, view: JsonObject): JsonObject {
  const retained = Object.fromEntries(
    Object.entries(source).filter(
      ([name]) => !["layoutType", "layoutVersion", "layouts", "variables"].includes(name)
    )
  );
  return {
    ...retained,
    $schema: "https://schemas.unifold.org/ui-document/1.0/schema.json",
    compositions: [],
    jsonUiProfile: {
      name: "unifold-jsonui",
      upstream: "5401b3d4900ca3032c108d6db00e8a819f4b28e9",
      version: "1.0.0"
    },
    view
  } as JsonObject;
}

function invalid(diagnostics: readonly CompositionDiagnostic[]): LayoutExpansionResult {
  return { diagnostics, status: LayoutExpansionStatus.Invalid };
}
