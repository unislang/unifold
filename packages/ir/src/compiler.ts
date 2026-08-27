import type {
  JsonObject,
  JsonUiNode,
  JsonValue,
  SemanticGraph,
  UiCollectionBehaviorDefinition,
  UiCompositionInstanceManifest,
  UiCompositionNodeProvenance,
  UiDocument,
  UiDerivedRuleDefinition,
  UiMachineDefinition,
  UiNodeEventBindings,
  UiStoreBinding,
  UiStoreDefinition
} from "@unislang/unifold-contracts";

import { CompilationStatus, UnifoldIrVersion } from "./enums.js";
import { remapCompilerDiagnosticPaths } from "./compiler-diagnostic-paths.js";
import type {
  CompileResult,
  CompileUiDocumentOptions,
  UnifoldIrDocument,
  UnifoldIrCollectionBehavior,
  UnifoldIrNode
} from "./types.js";
import { validateUiDocument } from "./validation.js";
import { nodeKindForComponent } from "./node-kind.js";
import {
  controlScopePath,
  controlTopologyFields,
  indexControlTopology,
  type ControlTopologyIndex
} from "./control-topology.js";

const RESERVED_NODE_PROPERTIES = new Set(["$children", "$comp", "events", "id", "path", "store"]);
interface CompileContext {
  readonly authoredSourcePointers: Readonly<Record<string, string>>;
  readonly controls: ControlTopologyIndex;
  readonly nodes: Map<string, UnifoldIrNode>;
  readonly provenance: Readonly<Record<string, UiCompositionNodeProvenance>>;
  readonly renderOrder: string[];
  readonly sourcePointers: Map<string, string>;
}

export function compileUiDocument(
  input: unknown,
  options: CompileUiDocumentOptions = {}
): CompileResult {
  const validation = validateUiDocument(input);
  const diagnostics = remapCompilerDiagnosticPaths(
    input,
    validation.diagnostics,
    sourcePointersOption(options)
  );
  if (validation.document === undefined) {
    return { diagnostics, status: CompilationStatus.Invalid };
  }
  return {
    diagnostics,
    document: buildDocument(validation.document, options),
    status: CompilationStatus.Valid
  };
}

function buildDocument(document: UiDocument, options: CompileUiDocumentOptions): UnifoldIrDocument {
  const context = createContext(document, options);
  compileNode(document.view, "/view", undefined, [], context);
  return {
    collectionBehaviorsById: collectionBehaviors(document.collectionBehaviors),
    compositionsByInstanceId: compositionInstances(document),
    documentId: document.id,
    documentRevision: document.revision,
    irVersion: UnifoldIrVersion.Version1_1,
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

function collectionBehaviors(
  definition: UiCollectionBehaviorDefinition | undefined
): Readonly<Record<string, UnifoldIrCollectionBehavior>> {
  const entries = (definition?.nodes ?? []).map(
    ({ collectionId, emptyFocusTargetId }) => [collectionId, { emptyFocusTargetId }] as const
  );
  return Object.fromEntries(entries.sort(([left], [right]) => left.localeCompare(right)));
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

function createContext(document: UiDocument, options: CompileUiDocumentOptions): CompileContext {
  return {
    authoredSourcePointers: sourcePointersOption(options),
    controls: indexControlTopology(document.controls),
    nodes: new Map(),
    provenance: compositionProvenance(document),
    renderOrder: [],
    sourcePointers: new Map()
  };
}

function sourcePointersOption(options: CompileUiDocumentOptions): Readonly<Record<string, string>> {
  return options.sourcePointersByNodeId ?? {};
}

function compositionProvenance(
  document: UiDocument
): Readonly<Record<string, UiCompositionNodeProvenance>> {
  return document.compositionManifest?.nodeProvenanceById ?? {};
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
    createIrNode(node, children, parentId, scopePath, context.provenance[node.id], context.controls)
  );
  context.renderOrder.push(node.id);
  context.sourcePointers.set(node.id, authoredSourcePointer(node.id, sourcePointer, context));
  children.forEach((child, index) =>
    compileNode(child, `${sourcePointer}/$children/${index}`, node.id, scopePath, context)
  );
}

function authoredSourcePointer(nodeId: string, fallback: string, context: CompileContext): string {
  return context.authoredSourcePointers[nodeId] ?? fallback;
}

function createIrNode(
  node: JsonUiNode,
  children: readonly JsonUiNode[],
  parentId: string | undefined,
  scopePath: readonly string[],
  composition: UiCompositionNodeProvenance | undefined,
  controls: ControlTopologyIndex
): UnifoldIrNode {
  const control = controlTopologyFields(node.id, controls);
  const base = {
    childIds: children.map(({ id }) => id),
    componentType: node.$comp,
    eventBindings: canonicalEventBindings(node),
    id: node.id,
    kind: compiledNodeKind(node, control),
    properties: extractProperties(node),
    scopePath: controlScopePath(node.id, scopePath, controls)
  };
  const structured = withParent(parentId, binding(node, withComposition(base, composition)));
  return applyControlFields(structured, control);
}

function compiledNodeKind(node: JsonUiNode, control: ReturnType<typeof controlTopologyFields>) {
  if (control !== undefined) return control.kind;
  return nodeKindForComponent(node.$comp) as NonNullable<ReturnType<typeof nodeKindForComponent>>;
}

function applyControlFields<T extends object>(
  node: T,
  control: ReturnType<typeof controlTopologyFields>
): T & Partial<NonNullable<ReturnType<typeof controlTopologyFields>>> {
  return control === undefined ? node : { ...node, ...control };
}

function canonicalEventBindings(node: JsonUiNode): UiNodeEventBindings {
  if (node.events === undefined) return {};
  return canonicalize(node.events) as UiNodeEventBindings;
}

function withComposition<T extends object>(
  value: T,
  composition: UiCompositionNodeProvenance | undefined
): T & { composition?: UiCompositionNodeProvenance } {
  if (composition === undefined) return value;
  return { ...value, composition };
}

function withParent<T extends object>(
  parentId: string | undefined,
  value: T
): T & { parentId?: string } {
  if (parentId === undefined) return value;
  return { ...value, parentId };
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
