import type { JsonObject, JsonValue } from "@unislang/unifold-contracts";

import { CompositionDiagnosticCode } from "./enums.js";
import { namespacedCompositionId } from "./identity.js";
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

interface ExpansionContext {
  readonly diagnostics: CompositionDiagnostic[];
  readonly ids: Set<string>;
  readonly sourcePointers: Record<string, string>;
  readonly variablePointers: Readonly<Record<string, string>>;
  readonly variables: Readonly<Record<string, JsonValue>>;
}

interface LayoutRootExpansionOptions {
  readonly rootPointer: string;
  readonly sourcePointers: Record<string, string>;
  readonly variablePointers: Readonly<Record<string, string>>;
}

interface RepeatDefinition {
  readonly alias: string;
  readonly key: string;
  readonly reference: string;
}

enum ConditionDecision {
  Exclude = "exclude",
  Include = "include",
  Invalid = "invalid"
}

const NODE_KEYS = new Set(["children", "events", "for", "id", "if", "key", "props", "type"]);
const REPEAT_PATTERN =
  /^([A-Za-z][A-Za-z0-9_-]*) in \{\{([A-Za-z][A-Za-z0-9_-]*(?:\.[A-Za-z][A-Za-z0-9_-]*)*)\}\}$/u;

export function expandLayoutRoot(
  value: unknown,
  variables: Readonly<Record<string, JsonValue>>,
  diagnostics: CompositionDiagnostic[],
  options: LayoutRootExpansionOptions
): JsonObject | undefined {
  const context = {
    diagnostics,
    ids: new Set<string>(),
    sourcePointers: options.sourcePointers,
    variablePointers: options.variablePointers,
    variables
  };
  const nodes = expandNodes(value, options.rootPointer, context);
  if (nodes.length === 1) return nodes[0];
  reportNode(options.rootPointer, context, "A layout template must produce exactly one root node.");
  return undefined;
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
  return booleanDecision(resolved);
}

function booleanDecision(value: boolean): ConditionDecision {
  return value ? ConditionDecision.Include : ConditionDecision.Exclude;
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
  const node = expandNode(value, path, context);
  return node === undefined ? [] : [node];
}

function expandRepeatedNode(
  value: Readonly<Record<string, unknown>>,
  path: string,
  context: ExpansionContext
): readonly JsonObject[] {
  const repeat = parseRepeat(value, path, context);
  if (repeat === undefined) return [];
  const items = resolveValue(`{{${repeat.reference}}}`, `${path}/for`, context);
  if (!Array.isArray(items)) return invalidRepeatSource(path, context);
  const sourcePointer = layoutValueSourcePointer(
    `{{${repeat.reference}}}`,
    `${path}/for`,
    context.variablePointers
  );
  return items.flatMap((item, index) => {
    const itemPointer = `${sourcePointer}/${String(index)}`;
    return expandRepeatedItem(item, value, repeat, path, itemPointer, context);
  });
}

function parseRepeat(
  value: Readonly<Record<string, unknown>>,
  path: string,
  context: ExpansionContext
): RepeatDefinition | undefined {
  const match = repeatMatch(value["for"], path, context);
  if (match === undefined) return undefined;
  const key = value["key"];
  if (!isSafeName(key)) return invalidRepeat(path, context);
  return { alias: match[1] as string, key, reference: match[2] as string };
}

function repeatMatch(
  value: unknown,
  path: string,
  context: ExpansionContext
): RegExpExecArray | undefined {
  if (typeof value !== "string") return invalidRepeat(path, context);
  const match = REPEAT_PATTERN.exec(value);
  if (match === null) return invalidRepeat(path, context);
  return match;
}

function expandRepeatedItem(
  item: unknown,
  node: Readonly<Record<string, unknown>>,
  repeat: RepeatDefinition,
  path: string,
  itemPointer: string,
  context: ExpansionContext
): readonly JsonObject[] {
  const record = repeatRecord(item, repeat.key, itemPointer, context);
  if (record === undefined) return [];
  const key = repeatKey(record[repeat.key], repeat.key, itemPointer, context);
  if (key === undefined) return [];
  return expandRepeatedRecord(record, key, node, repeat.alias, path, itemPointer, context);
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
  rejectUnknownKeys(value, NODE_KEYS, path, context.diagnostics);
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
  if (typeof value === "number") return Number.isFinite(value);
  return false;
}

function isValidStringKey(value: string): boolean {
  return value.length > 0 && value.length <= 128;
}

function invalidRepeatSource(path: string, context: ExpansionContext): readonly JsonObject[] {
  reportNode(`${path}/for`, context, "Node for source must resolve to an array.");
  return [];
}

function invalidRepeat(path: string, context: ExpansionContext): undefined {
  reportNode(`${path}/for`, context, "Node for requires 'item in {{items}}' and a safe key.");
  return undefined;
}

function missingRepeatKey(key: string, itemPointer: string, context: ExpansionContext): undefined {
  reportNode(itemPointer, context, `Repeated item requires key "${key}".`);
  return undefined;
}

function reportNode(path: string, context: ExpansionContext, message: string): undefined {
  add(context.diagnostics, CompositionDiagnosticCode.InvalidLayoutNode, path, message);
  return undefined;
}
