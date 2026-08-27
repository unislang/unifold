import type { JsonObject, JsonUiNode, JsonValue } from "@unislang/unifold-contracts";

import { CompositionDiagnosticCode } from "./enums.js";
import { registerCompositionControlTopology } from "./composition-control-mount.js";
import { compositionError } from "./diagnostics.js";
import type { ExpansionContext, ExpansionScope } from "./expansion-context.js";
import {
  expandedCompositionNodeId,
  legacyExpandedCompositionNodeId,
  namespacedCompositionId,
  recordCompositionIdentityAlias
} from "./identity.js";
import {
  controlAttachmentIds,
  createSlotExpansionScope,
  isLegacyCompatible,
  recordLocalId
} from "./expansion-scope.js";
import {
  createCompositionOwner,
  publishCompositionInstance,
  recordNodeProvenance
} from "./manifest.js";
import { resolveCompositionParameters, substituteParameters } from "./parameters.js";
import { childPath } from "./path.js";
import { compositionKey } from "./registry.js";
import {
  consumeCompositionSlot,
  createCompositionSlotContext,
  reportMissingSlotPlaceholders
} from "./slots.js";
import type { CompositionDefinition, CompositionInstance } from "./types.js";

export function expandNode(
  source: JsonObject,
  path: string,
  context: ExpansionContext,
  scope: ExpansionScope,
  stack: readonly string[],
  isRoot = false
): JsonUiNode | undefined {
  if (isCompositionInstance(source)) {
    return expandComposition(source, path, context, scope, stack);
  }
  return expandPlainNode(source, path, context, scope, stack, isRoot);
}

function expandComposition(
  source: CompositionInstance,
  path: string,
  context: ExpansionContext,
  scope: ExpansionScope,
  stack: readonly string[]
): JsonUiNode | undefined {
  const instanceId = namespacedCompositionId(scope.prefix, source.id);
  const legacyCompatible = isLegacyCompatible(source.id, scope);
  recordLocalId(source.id, instanceId, scope);
  const key = compositionKey(source.$compose, source.$version);
  const definition = context.registry.get(key);
  const label = `${source.$compose}@${source.$version}`;
  if (definition === undefined) return reportUnknownComposition(label, path, context);
  if (!canExpandComposition(key, label, path, context, stack)) return undefined;
  const definitionPath = context.definitionSourcePointers.get(key) as string;
  return materializeComposition(
    definition,
    source,
    instanceId,
    legacyCompatible,
    path,
    definitionPath,
    context,
    scope,
    [...stack, key]
  );
}

function canExpandComposition(
  key: string,
  label: string,
  path: string,
  context: ExpansionContext,
  stack: readonly string[]
): boolean {
  if (stack.includes(key)) return reportCycle(label, path, context) !== undefined;
  if (stack.length >= context.maxDepth) return reportMaxDepth(path, context) !== undefined;
  return true;
}

function materializeComposition(
  definition: CompositionDefinition,
  instance: CompositionInstance,
  instanceId: string,
  legacyCompatible: boolean,
  path: string,
  definitionPath: string,
  context: ExpansionContext,
  parentScope: ExpansionScope,
  stack: readonly string[]
): JsonUiNode | undefined {
  const state = createMaterializationState({
    context,
    definition,
    definitionPath,
    instance,
    instanceId,
    parentScope,
    path
  });
  const scope = compositionScope(instanceId, legacyCompatible, state);
  const node = expandNode(state.template, state.templatePath, context, scope, stack, true);
  reportMissingSlotPlaceholders(state.slots, path, context.diagnostics);
  publishCompositionInstance(definition, instanceId, state.localIds, state.owner, context);
  return node;
}

interface MaterializationRequest {
  readonly context: ExpansionContext;
  readonly definition: CompositionDefinition;
  readonly definitionPath: string;
  readonly instance: CompositionInstance;
  readonly instanceId: string;
  readonly parentScope: ExpansionScope;
  readonly path: string;
}

interface MaterializationState {
  readonly localIds: Map<string, string>;
  readonly owner: NonNullable<ExpansionScope["owner"]>;
  readonly slots: NonNullable<ExpansionScope["slots"]>;
  readonly template: JsonObject;
  readonly templatePath: string;
}

function createMaterializationState(request: MaterializationRequest): MaterializationState {
  const { context, definition, definitionPath, instance, instanceId, parentScope, path } = request;
  const parameters = resolveCompositionParameters(definition, instance, path, context.diagnostics);
  const templatePath = childPath(definitionPath, "template");
  const template = materializeTemplate(definition, parameters, templatePath, context);
  const slots = createCompositionSlotContext(definition, instance, path, context.diagnostics);
  const localIds = new Map<string, string>();
  const owner = createCompositionOwner(
    definition,
    instanceId,
    path,
    definitionPath,
    parentScope.owner
  );
  registerControlTopology(
    definition,
    instance,
    localIds,
    parentScope,
    definitionPath,
    path,
    context
  );
  return { localIds, owner, slots, template, templatePath };
}

function registerControlTopology(
  definition: CompositionDefinition,
  instance: CompositionInstance,
  localIds: ReadonlyMap<string, string>,
  parentScope: ExpansionScope,
  definitionPath: string,
  path: string,
  context: ExpansionContext
): void {
  registerCompositionControlTopology(
    definition,
    instance,
    localIds,
    controlAttachmentIds(parentScope),
    definitionPath,
    path,
    context
  );
}

function compositionScope(
  instanceId: string,
  legacyCompatible: boolean,
  state: MaterializationState
): ExpansionScope {
  return {
    localIds: state.localIds,
    legacyCompatible,
    owner: state.owner,
    prefix: instanceId,
    rootId: instanceId,
    slots: state.slots
  };
}

function materializeTemplate(
  definition: CompositionDefinition,
  parameters: JsonObject,
  templatePath: string,
  context: ExpansionContext
): JsonObject {
  return substituteParameters(
    definition.template,
    parameters,
    templatePath,
    context.diagnostics
  ) as JsonObject;
}

function expandPlainNode(
  source: JsonObject,
  path: string,
  context: ExpansionContext,
  scope: ExpansionScope,
  stack: readonly string[],
  isRoot: boolean
): JsonUiNode {
  const sourceId = source["id"] as string;
  const id = expandedCompositionNodeId(sourceId, scope, isRoot);
  const legacyId = legacyExpandedCompositionNodeId(id, sourceId, scope, isRoot);
  recordLocalId(sourceId, id, scope);
  registerNodeId(id, path, context);
  recordCompositionIdentityAlias(context.identityAliases, id, legacyId);
  recordNodeProvenance(sourceId, id, path, scope, context);
  const node = { ...withoutChildrenAndId(source), id } as JsonObject & {
    id: string;
    $comp: string;
  };
  const children = source["$children"];
  if (!Array.isArray(children)) return node;
  return { ...node, $children: expandChildren(children, path, context, scope, stack) };
}

function expandChildren(
  children: readonly JsonValue[],
  path: string,
  context: ExpansionContext,
  scope: ExpansionScope,
  stack: readonly string[]
): JsonUiNode[] {
  return children.flatMap((child, index) => {
    const childNode = child as JsonObject;
    const childNodePath = childPath(childPath(path, "$children"), index);
    if (isSlotPlaceholder(childNode))
      return expandSlot(childNode.$slot, childNodePath, context, scope, stack);
    const expanded = expandNode(childNode, childNodePath, context, scope, stack);
    return expanded === undefined ? [] : [expanded];
  });
}

function expandSlot(
  name: string,
  path: string,
  context: ExpansionContext,
  scope: ExpansionScope,
  stack: readonly string[]
): JsonUiNode[] {
  if (scope.slots === undefined) return [];
  const nodes = consumeCompositionSlot(name, scope.slots, path, context.diagnostics);
  return nodes.flatMap((node, index) => expandSlotNode(node, index, name, context, scope, stack));
}

function expandSlotNode(
  node: JsonObject,
  index: number,
  name: string,
  context: ExpansionContext,
  scope: ExpansionScope,
  stack: readonly string[]
): JsonUiNode[] {
  const owner = requireOwner(scope);
  const nodePath = childPath(
    childPath(childPath(owner.instanceSourcePointer, "slots"), name),
    index
  );
  const slotScope = createSlotExpansionScope(scope, name, nodePath);
  const expanded = expandNode(node, nodePath, context, slotScope, stack);
  return expanded === undefined ? [] : [expanded];
}

function requireOwner(scope: ExpansionScope): NonNullable<ExpansionScope["owner"]> {
  if (scope.owner === undefined) throw new Error("A validated slot must have a composition owner.");
  return scope.owner;
}

function registerNodeId(id: string, path: string, context: ExpansionContext): void {
  if (!context.emittedNodeIds.has(id)) {
    context.emittedNodeIds.add(id);
    return;
  }
  context.diagnostics.push(
    compositionError(
      CompositionDiagnosticCode.DuplicateNodeId,
      path,
      `Expanded node id is duplicated: ${id}.`
    )
  );
}

function withoutChildrenAndId(source: JsonObject): JsonObject {
  return Object.fromEntries(
    Object.entries(source).filter(([name]) => name !== "$children" && name !== "id")
  );
}

function reportUnknownComposition(key: string, path: string, context: ExpansionContext): undefined {
  context.diagnostics.push(
    compositionError(
      CompositionDiagnosticCode.UnknownComposition,
      path,
      `Composition definition was not found: ${key}.`
    )
  );
  return undefined;
}

function reportCycle(key: string, path: string, context: ExpansionContext): undefined {
  context.diagnostics.push(
    compositionError(
      CompositionDiagnosticCode.Cycle,
      path,
      `Composition nesting cycle detected at ${key}.`
    )
  );
  return undefined;
}

function reportMaxDepth(path: string, context: ExpansionContext): undefined {
  context.diagnostics.push(
    compositionError(
      CompositionDiagnosticCode.MaxDepth,
      path,
      `Composition nesting exceeds the maximum depth of ${context.maxDepth}.`
    )
  );
  return undefined;
}

function isCompositionInstance(source: JsonObject): source is CompositionInstance {
  return typeof source["$compose"] === "string";
}

function isSlotPlaceholder(source: JsonObject): source is JsonObject & { readonly $slot: string } {
  return typeof source["$slot"] === "string";
}
