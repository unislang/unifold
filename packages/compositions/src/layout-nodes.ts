import type { JsonObject, JsonValue } from "@unislang/unifold-contracts";

import { CompositionDiagnosticCode } from "./enums.js";
import { namespacedCompositionId } from "./identity.js";
import { recordCollectionMember } from "./layout-collection-controls.js";
import {
  BOOLEAN_CONDITION_DECISIONS,
  ConditionDecision,
  LAYOUT_NODE_KEYS,
  type LayoutNodeExpansionContext as ExpansionContext,
  type LayoutRootExpansionOptions
} from "./layout-node-configuration.js";
import {
  parseLayoutRepeat,
  registerLayoutCollection,
  rejectLayoutCollection,
  type LayoutRepeatDefinition
} from "./layout-collections.js";
import { resolveLayoutNodeContent } from "./layout-node-content.js";
import { layoutValueSourcePointer } from "./layout-source-pointers.js";
import {
  addLayoutDiagnostic as add,
  isLayoutObject as isObject,
  isSafeLayoutName as isSafeName,
  rejectUnknownLayoutKeys as rejectUnknownKeys,
  resolveLayoutValue
} from "./layout-values.js";
import type { CompositionDiagnostic } from "./types.js";

export function expandLayoutRoot(
  value: unknown,
  variables: Readonly<Record<string, JsonValue>>,
  diagnostics: CompositionDiagnostic[],
  options: LayoutRootExpansionOptions
): JsonObject | undefined {
  const context = expansionContext(variables, diagnostics, options);
  const nodes = expandNodes(value, options.rootPointer, context);
  if (nodes.length === 1) return nodes[0];
  reportNode(options.rootPointer, context, "A layout template must produce exactly one root node.");
  return undefined;
}

function expansionContext(
  variables: Readonly<Record<string, JsonValue>>,
  diagnostics: CompositionDiagnostic[],
  options: LayoutRootExpansionOptions
): ExpansionContext {
  return {
    collectionControlMembers: collectionMembers(options.collectionControlMembers),
    collectionsById: collectionDefinitions(options.collectionsById),
    diagnostics,
    ids: new Set<string>(),
    sourcePointers: options.sourcePointers,
    variablePointers: options.variablePointers,
    variables
  };
}

function collectionMembers(value: LayoutRootExpansionOptions["collectionControlMembers"]) {
  return value ?? [];
}

function collectionDefinitions(value: LayoutRootExpansionOptions["collectionsById"]) {
  return value ?? {};
}

function expandNodes(
  value: unknown,
  path: string,
  context: ExpansionContext
): readonly JsonObject[] {
  const node = requireNodeObject(value, path, context);
  if (node === undefined) return [];
  return expandObjectNodes(node, path, context);
}

function requireNodeObject(
  value: unknown,
  path: string,
  context: ExpansionContext
): Readonly<Record<string, unknown>> | undefined {
  if (isObject(value)) return value;
  return reportNode(path, context, "Layout node must be an object.");
}

function expandObjectNodes(
  value: Readonly<Record<string, unknown>>,
  path: string,
  context: ExpansionContext
): readonly JsonObject[] {
  const decision = conditionDecision(value["if"], path, context);
  if (decision === ConditionDecision.Invalid) return [];
  if (decision === ConditionDecision.Exclude) return [];
  return repeatOrSingle(value, path, context);
}

function conditionDecision(
  condition: unknown,
  path: string,
  context: ExpansionContext
): ConditionDecision {
  if (condition === undefined) return ConditionDecision.Include;
  const resolved = resolveValue(condition, `${path}/if`, context);
  if (typeof resolved !== "boolean") return invalidCondition(path, context);
  return BOOLEAN_CONDITION_DECISIONS[String(resolved) as "false" | "true"];
}

function invalidCondition(path: string, context: ExpansionContext): ConditionDecision {
  reportNode(`${path}/if`, context, "Node if must resolve to a boolean.");
  return ConditionDecision.Invalid;
}

function repeatOrSingle(
  value: Readonly<Record<string, unknown>>,
  path: string,
  context: ExpansionContext
): readonly JsonObject[] {
  if (value["for"] !== undefined) return expandRepeatedNode(value, path, context);
  return expandSingleNode(value, path, context);
}

function expandSingleNode(
  value: Readonly<Record<string, unknown>>,
  path: string,
  context: ExpansionContext
): readonly JsonObject[] {
  if (value["collection"] !== undefined) {
    rejectLayoutCollection(path, context.diagnostics);
    return [];
  }
  const node = expandNode(value, path, context);
  return node === undefined ? [] : [node];
}

function expandRepeatedNode(
  value: Readonly<Record<string, unknown>>,
  path: string,
  context: ExpansionContext
): readonly JsonObject[] {
  const repeat = parseLayoutRepeat(value, path, context.diagnostics);
  if (repeat === undefined) return [];
  return expandParsedRepeat(value, repeat, path, context);
}

function expandParsedRepeat(
  value: Readonly<Record<string, unknown>>,
  repeat: LayoutRepeatDefinition,
  path: string,
  context: ExpansionContext
): readonly JsonObject[] {
  const items = resolveValue(`{{${repeat.reference}}}`, `${path}/for`, context);
  if (!Array.isArray(items)) return invalidRepeatSource(path, context);
  const sourcePointer = layoutValueSourcePointer(
    `{{${repeat.reference}}}`,
    `${path}/for`,
    context.variablePointers
  );
  if (
    !registerLayoutCollection(
      repeat.collection,
      repeat.key,
      sourcePointer,
      path,
      context.collectionsById,
      context.diagnostics
    )
  )
    return [];
  return items.flatMap((item, index) => {
    const itemPointer = `${sourcePointer}/${String(index)}`;
    return expandRepeatedItem(item, value, repeat, path, itemPointer, context);
  });
}

function expandRepeatedItem(
  item: unknown,
  node: Readonly<Record<string, unknown>>,
  repeat: LayoutRepeatDefinition,
  path: string,
  itemPointer: string,
  context: ExpansionContext
): readonly JsonObject[] {
  const record = repeatRecord(item, repeat.key, itemPointer, context);
  if (record === undefined) return [];
  const key = repeatKey(record[repeat.key], repeat.key, itemPointer, context);
  if (key === undefined) return [];
  const expanded = expandRepeatedRecord(
    record,
    key,
    node,
    repeat.alias,
    path,
    itemPointer,
    context
  );
  recordCollectionMember(repeat.collection, key, expanded, context.collectionControlMembers);
  return expanded;
}

function repeatRecord(
  value: unknown,
  key: string,
  itemPointer: string,
  context: ExpansionContext
): Readonly<Record<string, unknown>> | undefined {
  if (!isObject(value)) return missingRepeatKey(key, itemPointer, context);
  if (!Object.hasOwn(value, key)) return missingRepeatKey(key, itemPointer, context);
  return value;
}

function repeatKey(
  value: unknown,
  key: string,
  itemPointer: string,
  context: ExpansionContext
): string | undefined {
  if (isValidRepeatKey(value)) return String(value);
  reportNode(`${itemPointer}/${key}`, context, "Repeat key must be a finite string or number.");
  return undefined;
}

function expandRepeatedRecord(
  record: Readonly<Record<string, unknown>>,
  key: string,
  node: Readonly<Record<string, unknown>>,
  alias: string,
  path: string,
  itemPointer: string,
  context: ExpansionContext
): readonly JsonObject[] {
  const variables = { ...context.variables, [alias]: record as JsonValue };
  const variablePointers = { ...context.variablePointers, [alias]: itemPointer };
  const expanded = expandNode(
    strippedRepeatNode(node),
    path,
    {
      ...context,
      variablePointers,
      variables
    },
    key
  );
  return expanded === undefined ? [] : [expanded];
}

function strippedRepeatNode(value: Readonly<Record<string, unknown>>): Record<string, unknown> {
  const node = { ...value };
  ["for", "if", "key"].forEach((key) => Reflect.deleteProperty(node, key));
  return node;
}

function expandNode(
  value: Readonly<Record<string, unknown>>,
  path: string,
  context: ExpansionContext,
  repeatKey?: string
): JsonObject | undefined {
  rejectUnknownKeys(value, LAYOUT_NODE_KEYS, path, context.diagnostics);
  const id = resolveNodeIdentity(value["id"], repeatKey, path, context);
  if (id === undefined) return undefined;
  return expandIdentifiedNode(value, id, path, context);
}

function expandIdentifiedNode(
  value: Readonly<Record<string, unknown>>,
  id: string,
  path: string,
  context: ExpansionContext
): JsonObject | undefined {
  const type = resolveValue(value["type"], `${path}/type`, context);
  if (!isSafeName(type)) return reportNode(`${path}/type`, context, "Component type is invalid.");
  return expandTypedNode(value, id, type, path, context);
}

function expandTypedNode(
  value: Readonly<Record<string, unknown>>,
  id: string,
  type: string,
  path: string,
  context: ExpansionContext
): JsonObject | undefined {
  const content = resolveLayoutNodeContent(value, path, context, (child, childPath) =>
    expandNodes(child, childPath, context)
  );
  if (content === undefined) return undefined;
  const node = { $comp: type, id, ...content.props, ...content.events };
  return content.children.length === 0 ? node : { $children: content.children, ...node };
}

function resolveNodeIdentity(
  value: unknown,
  repeatKey: string | undefined,
  path: string,
  context: ExpansionContext
): string | undefined {
  const baseId = resolveValue(value, `${path}/id`, context);
  if (!isSafeName(baseId)) return reportNode(`${path}/id`, context, "Node id is invalid.");
  const id = repeatedId(baseId, repeatKey);
  if (context.ids.has(id)) return reportNode(`${path}/id`, context, `Duplicate node id "${id}".`);
  context.ids.add(id);
  context.sourcePointers[id] = path;
  return id;
}

function repeatedId(baseId: string, repeatKey: string | undefined): string {
  return repeatKey === undefined ? baseId : namespacedCompositionId(baseId, repeatKey);
}

function resolveValue(value: unknown, path: string, context: ExpansionContext): unknown {
  return resolveLayoutValue(value, path, context.variables, context.diagnostics);
}

function isValidRepeatKey(value: unknown): boolean {
  if (typeof value === "string") return isValidStringKey(value);
  if (typeof value === "number") return Number.isSafeInteger(value);
  return false;
}

function isValidStringKey(value: string): boolean {
  return value.length > 0 && value.length <= 128;
}

function invalidRepeatSource(path: string, context: ExpansionContext): readonly JsonObject[] {
  reportNode(`${path}/for`, context, "Node for source must resolve to an array.");
  return [];
}

function missingRepeatKey(key: string, itemPointer: string, context: ExpansionContext): undefined {
  reportNode(itemPointer, context, `Repeated item requires key "${key}".`);
  return undefined;
}

function reportNode(path: string, context: ExpansionContext, message: string): undefined {
  add(context.diagnostics, CompositionDiagnosticCode.InvalidLayoutNode, path, message);
  return undefined;
}
