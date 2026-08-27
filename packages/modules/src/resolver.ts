import {
  expandComposedUiDocument,
  expandLayoutDocument,
  CompositionExpansionStatus,
  LayoutExpansionStatus,
  type CompositionDiagnostic,
  type LayoutExpansionResult
} from "@unislang/unifold-compositions";
import type { JsonObject } from "@unislang/unifold-contracts";

import { resolveUiModuleGraph, type UiModuleGraphNode } from "./graph.js";
import { uiModuleIntegrity } from "./integrity.js";
import { resolvedResourceValue, resolveLayoutRegistry } from "./layout-resources.js";
import { layoutDocumentSourceMap } from "./layout-source-map.js";
import { namespaceUiModuleContents, qualifiedModuleName } from "./namespacing.js";
import { uiModuleKey } from "./registry.js";
import {
  UiModuleDiagnosticCode,
  UiModuleResolutionStatus,
  type ResolveUiModuleOptions,
  type UiModuleDiagnostic,
  type UiModuleRegistry,
  type UiModuleResolutionResult,
  type UiModuleSourceLocation,
  type UiResolvedModuleGraphEntry,
  type UiResolvedModuleResource
} from "./types.js";

const MAXIMUM_COMPOSITIONS = 1_000;
const MAXIMUM_RESOURCES = 4_096;

interface FlattenedModules {
  readonly compositions: JsonObject[];
  readonly diagnostics: UiModuleDiagnostic[];
  readonly resources: Record<string, UiResolvedModuleResource>;
  readonly sourceMap: Record<string, UiModuleSourceLocation>;
}

export async function resolveUiModule(
  registry: UiModuleRegistry,
  options: ResolveUiModuleOptions
): Promise<UiModuleResolutionResult> {
  const root = registry.modules.get(uiModuleKey(options.moduleId, options.version));
  if (root === undefined) return rejected(rootDiagnostic(UiModuleDiagnosticCode.ModuleNotFound));
  return resolveRegisteredModule(registry, root, options);
}

async function resolveRegisteredModule(
  registry: UiModuleRegistry,
  root: UiModuleGraphNode["registered"],
  options: ResolveUiModuleOptions
): Promise<UiModuleResolutionResult> {
  const graph = resolveUiModuleGraph(registry, root);
  if (graph.diagnostics.length > 0) return rejected(...graph.diagnostics);
  return resolveModuleExport(graph.nodes, root, options);
}

async function resolveModuleExport(
  nodes: readonly UiModuleGraphNode[],
  root: UiModuleGraphNode["registered"],
  options: ResolveUiModuleOptions
): Promise<UiModuleResolutionResult> {
  const selected = root.module.exports.documents.find(({ name }) => name === options.exportName);
  if (selected === undefined)
    return rejected(rootDiagnostic(UiModuleDiagnosticCode.ExportNotFound));
  return flattenAndExpand(
    nodes,
    selected.document,
    root.module.exports.documents.indexOf(selected),
    options.layoutRegistry
  );
}

async function flattenAndExpand(
  nodes: readonly UiModuleGraphNode[],
  rootDocument: JsonObject,
  documentIndex: number,
  layoutRegistry: ResolveUiModuleOptions["layoutRegistry"]
): Promise<UiModuleResolutionResult> {
  const flattened = flattenModules(nodes);
  const root = nodes.at(-1) as UiModuleGraphNode;
  const authored = rewrittenRootDocument(root, rootDocument, flattened);
  const layouts = resolveLayoutRegistry(nodes, layoutRegistry);
  flattened.diagnostics.push(...layouts.diagnostics);
  const layout = expandedLayout(authored, root.registered.sourceId, layouts.registry);
  flattened.diagnostics.push(...layout.diagnostics);
  if (flattened.diagnostics.length > 0) return rejected(...flattened.diagnostics);
  appendDocumentSourceMap(
    flattened,
    layout.document as JsonObject,
    layout.sourcePointersByNodeId,
    root,
    documentIndex,
    layouts.registrySources
  );
  const composedDocument = {
    ...(layout.document as JsonObject),
    compositions: flattened.compositions
  };
  return expandArtifact(composedDocument, nodes, flattened);
}

function rewrittenRootDocument(
  root: UiModuleGraphNode,
  document: JsonObject,
  flattened: FlattenedModules
): JsonObject {
  const contents = namespaceUiModuleContents(root.registered.module, "", root.registered.sourceId);
  flattened.diagnostics.push(...contents.diagnostics);
  return contents.rewriteDocument(document);
}

function appendDocumentSourceMap(
  flattened: FlattenedModules,
  document: JsonObject,
  sourcePointersByNodeId: Readonly<Record<string, string>> | undefined,
  root: UiModuleGraphNode,
  documentIndex: number,
  registrySources: ReadonlyMap<number, UiModuleSourceLocation>
): void {
  const documentSource = sourceLocation(
    root,
    `/exports/documents/${String(documentIndex)}/document`
  );
  Object.assign(
    flattened.sourceMap,
    layoutDocumentSourceMap({
      document,
      documentSource,
      registrySources,
      ...(sourcePointersByNodeId === undefined ? {} : { sourcePointersByNodeId })
    })
  );
}

interface ExpandedLayoutResult {
  readonly diagnostics: readonly UiModuleDiagnostic[];
  readonly document?: JsonObject;
  readonly sourcePointersByNodeId?: Readonly<Record<string, string>>;
}

function expandedLayout(
  authored: JsonObject,
  sourceId: string,
  registry: ResolveUiModuleOptions["layoutRegistry"]
): ExpandedLayoutResult {
  const expansion = expandLayoutWithRegistry(authored, registry);
  if (expansion.status === LayoutExpansionStatus.Invalid) {
    return { diagnostics: expansion.diagnostics.map((item) => layoutDiagnostic(item, sourceId)) };
  }
  return successfulLayout(expansion, authored);
}

function successfulLayout(
  expansion: LayoutExpansionResult,
  authored: JsonObject
): ExpandedLayoutResult {
  const document = expansion.document ?? authored;
  if (expansion.sourcePointersByNodeId === undefined) return { diagnostics: [], document };
  return { diagnostics: [], document, sourcePointersByNodeId: expansion.sourcePointersByNodeId };
}

function expandLayoutWithRegistry(
  authored: JsonObject,
  registry: ResolveUiModuleOptions["layoutRegistry"]
) {
  if (registry === undefined) return expandLayoutDocument(authored);
  return expandLayoutDocument(authored, { registry });
}

function layoutDiagnostic(diagnostic: CompositionDiagnostic, sourceId: string): UiModuleDiagnostic {
  return {
    code: UiModuleDiagnosticCode.CompositionInvalid,
    message: diagnostic.message,
    path: diagnostic.path,
    sourceId
  };
}

function flattenModules(nodes: readonly UiModuleGraphNode[]): FlattenedModules {
  const state: FlattenedModules = {
    compositions: [],
    diagnostics: [],
    resources: {},
    sourceMap: {}
  };
  nodes.forEach((node) => appendModule(node, state));
  if (state.compositions.length > MAXIMUM_COMPOSITIONS)
    state.diagnostics.push(rootDiagnostic(UiModuleDiagnosticCode.ResourceLimitExceeded));
  if (Object.keys(state.resources).length > MAXIMUM_RESOURCES)
    state.diagnostics.push(rootDiagnostic(UiModuleDiagnosticCode.ResourceLimitExceeded));
  return state;
}

function appendModule(node: UiModuleGraphNode, state: FlattenedModules): void {
  const contents = namespaceUiModuleContents(
    node.registered.module,
    node.namespace,
    node.registered.sourceId
  );
  state.diagnostics.push(...contents.diagnostics);
  contents.compositions.forEach((definition, index) => {
    const outputIndex = state.compositions.length;
    state.compositions.push(definition);
    state.sourceMap[`/compositions/${outputIndex}`] = sourceLocation(
      node,
      `/exports/compositions/${index}`
    );
  });
  node.registered.module.exports.resources.forEach((resource, index) =>
    appendResource(node, resource, index, state)
  );
}

function appendResource(
  node: UiModuleGraphNode,
  resource: UiModuleGraphNode["registered"]["module"]["exports"]["resources"][number],
  index: number,
  state: FlattenedModules
): void {
  const key = qualifiedModuleName(node.namespace, `${resource.kind}/${resource.id}`);
  if (state.resources[key] !== undefined) {
    state.diagnostics.push(rootDiagnostic(UiModuleDiagnosticCode.DuplicateResource));
    return;
  }
  state.resources[key] = { ...resource, id: key, value: resolvedResourceValue(resource, key) };
  state.sourceMap[`/resources/${pointerToken(key)}`] = sourceLocation(
    node,
    `/exports/resources/${index}`
  );
}

async function expandArtifact(
  composedDocument: JsonObject,
  nodes: readonly UiModuleGraphNode[],
  flattened: FlattenedModules
): Promise<UiModuleResolutionResult> {
  const expansion = expandComposedUiDocument(composedDocument);
  if (expansion.status !== CompositionExpansionStatus.Valid || expansion.document === undefined) {
    return rejected(...compositionDiagnostics(expansion.diagnostics));
  }
  return resolvedArtifact(composedDocument, expansion.document, nodes, flattened);
}

function compositionDiagnostics(
  diagnostics: readonly CompositionDiagnostic[]
): UiModuleDiagnostic[] {
  return diagnostics.map(({ message, path }) => ({
    code: UiModuleDiagnosticCode.CompositionInvalid,
    message,
    path
  }));
}

async function resolvedArtifact(
  composedDocument: JsonObject,
  document: JsonObject,
  nodes: readonly UiModuleGraphNode[],
  flattened: FlattenedModules
): Promise<UiModuleResolutionResult> {
  const content = {
    composedDocument,
    document,
    graph: nodes.map(graphEntry),
    resources: flattened.resources,
    sourceMap: flattened.sourceMap
  };
  return {
    artifact: {
      ...content,
      integrity: await uiModuleIntegrity(content)
    },
    diagnostics: [],
    status: UiModuleResolutionStatus.Resolved
  };
}

function graphEntry(node: UiModuleGraphNode): UiResolvedModuleGraphEntry {
  const { integrity, module, sourceId } = node.registered;
  return {
    integrity,
    moduleId: module.id,
    namespace: node.namespace,
    sourceId,
    version: module.version
  };
}

function sourceLocation(node: UiModuleGraphNode, pointer: string): UiModuleSourceLocation {
  const { module, sourceId } = node.registered;
  return { moduleId: module.id, pointer, sourceId, version: module.version };
}

function pointerToken(value: string): string {
  return value.replaceAll("~", "~0").replaceAll("/", "~1");
}

function rootDiagnostic(code: UiModuleDiagnosticCode): UiModuleDiagnostic {
  return { code, message: `UiModule resolution failed: ${code}.`, path: "/" };
}

function rejected(...diagnostics: readonly UiModuleDiagnostic[]): UiModuleResolutionResult {
  return { diagnostics, status: UiModuleResolutionStatus.Rejected };
}
