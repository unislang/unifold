import type {
  JsonObject,
  JsonUiNode,
  JsonValue,
  SemanticGraph,
  UiCompositionInstanceManifest,
  UiCompositionNodeProvenance,
  UiDocument,
  UiDerivedRuleDefinition,
  UiMachineDefinition,
  UiStoreBinding,
  UiStoreDefinition
} from "@unislang/unifold-contracts";

import { CompilationStatus, UnifoldIrVersion } from "./enums.js";
import type { CompileResult, UnifoldIrDocument, UnifoldIrNode } from "./types.js";
import { validateUiDocument } from "./validation.js";
import { nodeKindForComponent } from "./node-kind.js";

const RESERVED_NODE_PROPERTIES = new Set(["$children", "$comp", "id", "path", "store"]);
interface CompileContext {
  readonly nodes: Map<string, UnifoldIrNode>;
  readonly provenance: Readonly<Record<string, UiCompositionNodeProvenance>>;
  readonly renderOrder: string[];
  readonly sourcePointers: Map<string, string>;
}

export function compileUiDocument(input: unknown): CompileResult {
  const validation = validateUiDocument(input);
  if (validation.document === undefined) {
    return { diagnostics: validation.diagnostics, status: CompilationStatus.Invalid };
  }
  return {
    diagnostics: validation.diagnostics,
    document: buildDocument(validation.document),
    status: CompilationStatus.Valid
  };
}

function buildDocument(document: UiDocument): UnifoldIrDocument {
  const context = createContext(document);
  compileNode(document.view, "/view", undefined, [], context);
  return {
    compositionsByInstanceId: compositionInstances(document),
    documentId: document.id,
    documentRevision: document.revision,
    irVersion: UnifoldIrVersion.Version1,
    machines: canonicalMachines(document.machines),
    nodeIdentityAliases: document.compositionManifest?.identityAliases ?? {},
    nodesById: sortedRecord(context.nodes),
    renderOrder: context.renderOrder,
    rules: canonicalRules(document.rules),
    rootNodeId: document.view.id,
    ...semanticField(document.semantics),
    source: {
      documentSchemaVersion: document.schemaVersion,
      jsonUiProfile: `${document.jsonUiProfile.name}@${document.jsonUiProfile.version}`,
      jsonUiUpstreamRevision: document.jsonUiProfile.upstream
    },
    sourcePointersByNodeId: sortedRecord(context.sourcePointers),
    storesById: canonicalStores(document.stores)
  };
}

function semanticField(semantics: SemanticGraph | undefined): {
  readonly semantics?: SemanticGraph;
} {
  if (semantics === undefined) return {};
  return { semantics: canonicalize(semantics) as unknown as SemanticGraph };
}

function canonicalMachines(
  machines: readonly UiMachineDefinition[] | undefined
): readonly UiMachineDefinition[] {
  return (machines ?? [])
    .map((machine) => canonicalize(machine) as UiMachineDefinition)
    .sort(({ id: left }, { id: right }) => left.localeCompare(right));
}

function canonicalRules(
  rules: readonly UiDerivedRuleDefinition[] | undefined
): readonly UiDerivedRuleDefinition[] {
  return (rules ?? [])
    .map((rule) => canonicalize(rule) as UiDerivedRuleDefinition)
    .sort(({ id: left }, { id: right }) => left.localeCompare(right));
}

function createContext(document: UiDocument): CompileContext {
  return {
    nodes: new Map(),
    provenance: document.compositionManifest?.nodeProvenanceById ?? {},
    renderOrder: [],
    sourcePointers: new Map()
  };
}

function compileNode(
  node: JsonUiNode,
  sourcePointer: string,
  parentId: string | undefined,
  parentScope: readonly string[],
  context: CompileContext
): void {
  const children = node.$children ?? [];
  const scopePath = [...parentScope, node.id];
  context.nodes.set(
    node.id,
    createIrNode(node, children, parentId, scopePath, context.provenance[node.id])
  );
  context.renderOrder.push(node.id);
  context.sourcePointers.set(node.id, sourcePointer);
  children.forEach((child, index) =>
    compileNode(child, `${sourcePointer}/$children/${index}`, node.id, scopePath, context)
  );
}

function createIrNode(
  node: JsonUiNode,
  children: readonly JsonUiNode[],
  parentId: string | undefined,
  scopePath: readonly string[],
  composition: UiCompositionNodeProvenance | undefined
): UnifoldIrNode {
  const base = {
    childIds: children.map(({ id }) => id),
    componentType: node.$comp,
    id: node.id,
    kind: nodeKindForComponent(node.$comp) as NonNullable<ReturnType<typeof nodeKindForComponent>>,
    properties: extractProperties(node),
    scopePath
  };
  const withComposition = composition === undefined ? base : { ...base, composition };
  const withBinding = binding(node, withComposition);
  return parentId === undefined ? withBinding : { ...withBinding, parentId };
}

function binding<T extends object>(node: JsonUiNode, value: T): T & { binding?: UiStoreBinding } {
  if (node.store === undefined || node.path === undefined) return value;
  return { ...value, binding: { path: node.path, store: node.store } };
}

function extractProperties(node: JsonUiNode): JsonObject {
  const entries = Object.entries(node)
    .filter(([key]) => !RESERVED_NODE_PROPERTIES.has(key))
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => [key, canonicalize(value as JsonValue)] as const);
  return Object.fromEntries(entries) as JsonObject;
}

function canonicalize(value: JsonValue): JsonValue {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (isJsonObject(value)) return canonicalizeObject(value);
  return value;
}

function canonicalizeObject(value: JsonObject): JsonObject {
  const entries = Object.entries(value)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, item]) => [key, canonicalize(item as JsonValue)] as const);
  return Object.fromEntries(entries) as JsonObject;
}

function isJsonObject(value: JsonValue): value is JsonObject {
  if (value === null) return false;
  if (typeof value !== "object") return false;
  return !Array.isArray(value);
}

function sortedRecord<T>(values: ReadonlyMap<string, T>): Readonly<Record<string, T>> {
  return Object.fromEntries(
    [...values.entries()].sort(([left], [right]) => left.localeCompare(right))
  );
}

function compositionInstances(
  document: UiDocument
): Readonly<Record<string, UiCompositionInstanceManifest>> {
  const entries =
    document.compositionManifest?.instances.map(
      (instance) => [instance.instanceId, instance] as const
    ) ?? [];
  return Object.fromEntries(entries.sort(([left], [right]) => left.localeCompare(right)));
}

function canonicalStores(
  stores: readonly UiStoreDefinition[] | undefined
): Readonly<Record<string, UiStoreDefinition>> {
  const entries = (stores ?? []).map((store) => [store.id, canonicalize(store)] as const);
  return Object.fromEntries(entries.sort(([left], [right]) => left.localeCompare(right))) as Record<
    string,
    UiStoreDefinition
  >;
}
