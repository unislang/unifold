import {
  UI_COMPOSITION_IDENTITY_VERSION,
  UiCompositionManifestVersion,
  UiControlTopologyVersion,
  type JsonObject,
  type UiCompositionManifest
} from "@unislang/unifold-contracts";

import { CompositionExpansionStatus } from "./enums.js";
import {
  createControlAuthority,
  finalizeCompositionControlTopologies
} from "./composition-control-mount.js";
import { validateCompositionDefinitions } from "./definition-validation.js";
import type { ExpansionContext } from "./expansion-context.js";
import { expandNode } from "./node-expansion.js";
import { compositionKey, createCompositionRegistry } from "./registry.js";
import type {
  ComposedUiDocument,
  CompositionDiagnostic,
  CompositionExpansionOptions,
  CompositionExpansionResult
} from "./types.js";
import { validateComposedDocument } from "./validation.js";

const DEFAULT_MAX_DEPTH = 20;

export function expandComposedUiDocument(
  value: unknown,
  options: CompositionExpansionOptions = {}
): CompositionExpansionResult {
  const validation = validateComposedDocument(value);
  if (validation.document === undefined) return invalidValidationResult(validation.diagnostics);
  return expandValidatedDocument(validation.document, options);
}

function expandValidatedDocument(
  source: ComposedUiDocument,
  options: CompositionExpansionOptions
): CompositionExpansionResult {
  const diagnostics: CompositionDiagnostic[] = [];
  const registry = createCompositionRegistry(source.compositions, diagnostics);
  const context = createExpansionContext(source, options, diagnostics, registry);
  validateCompositionDefinitions(source.compositions, context.registry, diagnostics);
  if (diagnostics.length > 0) return invalidExpansionResult(context);
  const view = expandNode(source.view, "/view", context, {}, []);
  finalizeCompositionControlTopologies(context);
  if (expansionFailed(view, context)) return invalidExpansionResult(context);
  const manifest = createManifest(context);
  return {
    diagnostics,
    document: expandedDocument(source, context, manifest, view),
    exportsByInstanceId: context.exportsByInstanceId,
    manifest,
    status: CompositionExpansionStatus.Valid
  };
}

function createExpansionContext(
  source: ComposedUiDocument,
  options: CompositionExpansionOptions,
  diagnostics: CompositionDiagnostic[],
  registry: ExpansionContext["registry"]
): ExpansionContext {
  const controlNodes = sourceControlNodes(source);
  return {
    controlNodeIds: createControlAuthority(controlNodes, diagnostics),
    controlNodeKinds: new Map(controlNodes.map(({ id, kind }) => [id, kind])),
    controlNodes: [...controlNodes],
    definitionSourcePointers: definitionSourcePointers(source),
    diagnostics,
    emittedNodeIds: new Set(),
    exportsByInstanceId: {},
    identityAliases: {},
    instances: [],
    maxDepth: normalizedMaxDepth(options),
    nodeProvenanceById: {},
    pendingControlTopologies: [],
    registry
  };
}

function sourceControlNodes(source: ComposedUiDocument) {
  return source.controls === undefined ? [] : source.controls.nodes;
}

function expandedDocument(
  source: ComposedUiDocument,
  context: ExpansionContext,
  manifest: UiCompositionManifest,
  view: NonNullable<CompositionExpansionResult["document"]>["view"]
): JsonObject & { readonly view: typeof view } {
  const document = {
    ...withoutCompositionDefinitions(source),
    compositionManifest: manifest,
    view
  };
  if (source.controls === undefined && context.controlNodes.length === 0) return document;
  const controls = {
    contractVersion: UiControlTopologyVersion.Version1,
    nodes: context.controlNodes
  };
  return { ...document, controls };
}

function expansionFailed(
  view: ReturnType<typeof expandNode>,
  context: ExpansionContext
): view is undefined {
  return context.diagnostics.length > 0 || view === undefined;
}

function invalidValidationResult(
  diagnostics: CompositionExpansionResult["diagnostics"]
): CompositionExpansionResult {
  return {
    diagnostics,
    exportsByInstanceId: {},
    status: CompositionExpansionStatus.Invalid
  };
}

function invalidExpansionResult(context: ExpansionContext): CompositionExpansionResult {
  return {
    diagnostics: context.diagnostics,
    exportsByInstanceId: {},
    status: CompositionExpansionStatus.Invalid
  };
}

function withoutCompositionDefinitions(source: ComposedUiDocument): JsonObject {
  return Object.fromEntries(Object.entries(source).filter(([name]) => name !== "compositions"));
}

function definitionSourcePointers(source: ComposedUiDocument): ReadonlyMap<string, string> {
  return new Map(
    source.compositions.map((definition, index) => [
      compositionKey(definition.name, definition.version),
      `/compositions/${index}`
    ])
  );
}

function createManifest(context: ExpansionContext): UiCompositionManifest {
  return {
    contractVersion: UiCompositionManifestVersion.Version1,
    identityAliases: sortedRecord(context.identityAliases),
    identityVersion: UI_COMPOSITION_IDENTITY_VERSION,
    instances: [...context.instances].sort((left, right) =>
      left.instanceId.localeCompare(right.instanceId)
    ),
    nodeProvenanceById: sortedRecord(context.nodeProvenanceById)
  };
}

function sortedRecord<T>(source: Readonly<Record<string, T>>): Readonly<Record<string, T>> {
  return Object.fromEntries(
    Object.entries(source).sort(([left], [right]) => left.localeCompare(right))
  );
}

function normalizedMaxDepth(options: CompositionExpansionOptions): number {
  return Math.max(0, Math.floor(options.maxDepth ?? DEFAULT_MAX_DEPTH));
}
