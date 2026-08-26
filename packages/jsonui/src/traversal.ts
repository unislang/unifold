import { JsonUiFeature, JsonUiProfileDiagnosticCode, JsonUiProfileLimit } from "./enums.js";
import { addProfileDiagnostic, asJsonRecord, escapeJsonPointer } from "./diagnostic-helpers.js";
import type { JsonUiProfileDiagnostic } from "./types.js";

const NODE_FEATURES: Readonly<Record<string, JsonUiFeature>> = Object.freeze({
  $isList: JsonUiFeature.List,
  $itemPerPage: JsonUiFeature.List,
  $listItem: JsonUiFeature.List,
  $listLength: JsonUiFeature.List,
  $locales: JsonUiFeature.Localization,
  $page: JsonUiFeature.List,
  $pathModifiers: JsonUiFeature.StorePathBinding,
  $translate: JsonUiFeature.Localization,
  $validations: JsonUiFeature.InlineValidation,
  onStateExport: JsonUiFeature.StateExport
});
const ALLOWED_DIRECTIVES = new Set(["$children", "$comp"]);

interface TraversalState {
  readonly ancestors: WeakSet<object>;
  readonly diagnostics: JsonUiProfileDiagnostic[];
  components: number;
  visited: number;
}

export function scanJsonUiView(
  value: unknown,
  diagnostics: JsonUiProfileDiagnostic[],
  storeIds: ReadonlySet<string> = new Set()
): void {
  const state: TraversalState = {
    ancestors: new WeakSet(),
    components: 0,
    diagnostics,
    visited: 0
  };
  const root = asJsonRecord(value);
  if (root !== undefined) return scanNode(root, "/view", 0, state, storeIds);
  addProfileDiagnostic(
    {
      code: JsonUiProfileDiagnosticCode.InvalidView,
      feature: JsonUiFeature.ComponentTree,
      message: "The JsonUI view must be a component node object.",
      path: "/view"
    },
    diagnostics
  );
}

function scanNode(
  node: Readonly<Record<string, unknown>>,
  path: string,
  depth: number,
  state: TraversalState,
  storeIds: ReadonlySet<string>
): void {
  if (!enterComponent(node, path, depth, state)) return;
  validateStableId(node["id"], `${path}/id`, state.diagnostics);
  if (!hasDeclaredStorePath(node, storeIds)) {
    addUnsupported(JsonUiFeature.StorePathBinding, path, state.diagnostics);
  }
  Object.entries(node).forEach(([key, item]) =>
    scanNodeEntry(key, item, path, depth + 1, state, storeIds)
  );
  leaveObject(node, state);
}

function validateStableId(
  value: unknown,
  path: string,
  diagnostics: JsonUiProfileDiagnostic[]
): void {
  if (typeof value === "string" && value.length > 0) return;
  addUnsupported(JsonUiFeature.StableNodeId, path, diagnostics);
}

function scanNodeEntry(
  key: string,
  value: unknown,
  path: string,
  depth: number,
  state: TraversalState,
  storeIds: ReadonlySet<string>
): void {
  if (key === "$children") return scanChildren(value, `${path}/$children`, depth, state, storeIds);
  const feature = nodeFeature(key);
  if (feature !== undefined)
    return addUnsupported(feature, `${path}/${escapeJsonPointer(key)}`, state.diagnostics);
  scanNodePropertyExpression(key, value, `${path}/${escapeJsonPointer(key)}`, depth, state);
}

function scanChildren(
  value: unknown,
  path: string,
  depth: number,
  state: TraversalState,
  storeIds: ReadonlySet<string>
): void {
  if (!Array.isArray(value))
    return addUnsupported(JsonUiFeature.PrimitiveChild, path, state.diagnostics);
  if (!enterObject(value, path, depth, state)) return;
  value.forEach((child, index) => scanChild(child, `${path}/${index}`, depth + 1, state, storeIds));
  leaveObject(value, state);
}

function scanChild(
  value: unknown,
  path: string,
  depth: number,
  state: TraversalState,
  storeIds: ReadonlySet<string>
): void {
  const child = asJsonRecord(value);
  if (child !== undefined) return scanNode(child, path, depth, state, storeIds);
  addUnsupported(JsonUiFeature.PrimitiveChild, path, state.diagnostics);
}

function scanNodePropertyExpression(
  key: string,
  value: unknown,
  path: string,
  depth: number,
  state: TraversalState
): void {
  if (isEventProperty(key)) return scanActionExpression(value, path, depth, state);
  scanModifierExpression(value, path, depth, state);
}

function scanActionExpression(
  value: unknown,
  path: string,
  depth: number,
  state: TraversalState
): void {
  if (Array.isArray(value)) return scanActionArray(value, path, depth, state);
  const action = asJsonRecord(value);
  if (action !== undefined) scanActionObject(action, path, depth, state);
}

function scanActionArray(
  values: readonly unknown[],
  path: string,
  depth: number,
  state: TraversalState
): void {
  if (!enterObject(values, path, depth, state)) return;
  values.forEach((value, index) =>
    scanActionExpression(value, `${path}/${index}`, depth + 1, state)
  );
  leaveObject(values, state);
}

function scanActionObject(
  value: Readonly<Record<string, unknown>>,
  path: string,
  depth: number,
  state: TraversalState
): void {
  if (!enterObject(value, path, depth, state)) return;
  reportExpression(value, "$action", JsonUiFeature.Action, path, state.diagnostics);
  Object.entries(value).forEach(([key, item]) =>
    scanActionExpression(item, `${path}/${escapeJsonPointer(key)}`, depth + 1, state)
  );
  leaveObject(value, state);
}

function scanModifierExpression(
  value: unknown,
  path: string,
  depth: number,
  state: TraversalState
): void {
  if (Array.isArray(value)) return scanModifierArray(value, path, depth, state);
  const modifier = asJsonRecord(value);
  if (modifier !== undefined) scanModifierObject(modifier, path, depth, state);
}

function scanModifierArray(
  values: readonly unknown[],
  path: string,
  depth: number,
  state: TraversalState
): void {
  if (!enterObject(values, path, depth, state)) return;
  values.forEach((value, index) =>
    scanModifierExpression(value, `${path}/${index}`, depth + 1, state)
  );
  leaveObject(values, state);
}

function scanModifierObject(
  value: Readonly<Record<string, unknown>>,
  path: string,
  depth: number,
  state: TraversalState
): void {
  if (!enterObject(value, path, depth, state)) return;
  reportExpression(value, "$modifier", JsonUiFeature.Modifier, path, state.diagnostics);
  Object.entries(value).forEach(([key, item]) =>
    scanModifierExpression(item, `${path}/${escapeJsonPointer(key)}`, depth + 1, state)
  );
  leaveObject(value, state);
}

function reportExpression(
  value: Readonly<Record<string, unknown>>,
  key: string,
  feature: JsonUiFeature,
  path: string,
  diagnostics: JsonUiProfileDiagnostic[]
): void {
  if (!Object.hasOwn(value, key)) return;
  addUnsupported(feature, `${path}/${escapeJsonPointer(key)}`, diagnostics);
  reportJsonata(value, path, diagnostics);
}

function reportJsonata(
  value: Readonly<Record<string, unknown>>,
  path: string,
  diagnostics: JsonUiProfileDiagnostic[]
): void {
  if (!Object.hasOwn(value, "jsonataDef")) return;
  addUnsupported(JsonUiFeature.Jsonata, `${path}/jsonataDef`, diagnostics);
}

function nodeFeature(key: string): JsonUiFeature | undefined {
  const feature = NODE_FEATURES[key];
  if (feature !== undefined) return feature;
  return namedSlotFeature(key);
}

function namedSlotFeature(key: string): JsonUiFeature | undefined {
  if (key.startsWith("$child")) return JsonUiFeature.NamedSlot;
  return unknownDirectiveFeature(key);
}

function unknownDirectiveFeature(key: string): JsonUiFeature | undefined {
  if (!key.startsWith("$")) return undefined;
  if (ALLOWED_DIRECTIVES.has(key)) return undefined;
  return JsonUiFeature.UnknownDirective;
}

function enterObject(value: object, path: string, depth: number, state: TraversalState): boolean {
  if (!withinDepth(path, depth, state)) return false;
  return registerObject(value, path, state);
}

function enterComponent(
  value: object,
  path: string,
  depth: number,
  state: TraversalState
): boolean {
  if (!enterObject(value, path, depth, state)) return false;
  if (state.components < JsonUiProfileLimit.Components) return registerComponent(state);
  leaveObject(value, state);
  return addComponentLimit(path, state.diagnostics);
}

function registerComponent(state: TraversalState): true {
  state.components += 1;
  return true;
}

function withinDepth(path: string, depth: number, state: TraversalState): boolean {
  if (depth <= JsonUiProfileLimit.Depth) return true;
  addResourceLimit("depth", path, state.diagnostics);
  return false;
}

function registerObject(value: object, path: string, state: TraversalState): boolean {
  if (state.ancestors.has(value)) return addCycle(path, state.diagnostics);
  if (state.visited >= JsonUiProfileLimit.TraversedObjects)
    return addTraversalLimit(path, state.diagnostics);
  state.ancestors.add(value);
  state.visited += 1;
  return true;
}

function leaveObject(value: object, state: TraversalState): void {
  state.ancestors.delete(value);
}

function addCycle(path: string, diagnostics: JsonUiProfileDiagnostic[]): false {
  addProfileDiagnostic(
    {
      code: JsonUiProfileDiagnosticCode.TraversalCycle,
      message: "The JsonUI profile input contains a cycle.",
      path
    },
    diagnostics
  );
  return false;
}
function addComponentLimit(path: string, diagnostics: JsonUiProfileDiagnostic[]): false {
  addResourceLimit("component node", path, diagnostics);
  return false;
}
function addTraversalLimit(path: string, diagnostics: JsonUiProfileDiagnostic[]): false {
  addResourceLimit("object", path, diagnostics);
  return false;
}

function addResourceLimit(
  limit: string,
  path: string,
  diagnostics: JsonUiProfileDiagnostic[]
): void {
  addProfileDiagnostic(
    {
      code: JsonUiProfileDiagnosticCode.ResourceLimit,
      message: `The JsonUI profile ${limit} traversal limit was exceeded.`,
      path
    },
    diagnostics
  );
}

function hasDeclaredStorePath(
  value: Readonly<Record<string, unknown>>,
  storeIds: ReadonlySet<string>
): boolean {
  const store = value["store"];
  const path = value["path"];
  if (store === undefined) return path === undefined;
  return hasDeclaredPath(store, path, storeIds);
}
function hasDeclaredPath(store: unknown, path: unknown, storeIds: ReadonlySet<string>): boolean {
  if (typeof store !== "string") return false;
  if (typeof path !== "string") return false;
  return storeIds.has(store);
}
function isEventProperty(key: string): boolean {
  return /^on[A-Z]/u.test(key);
}
function addUnsupported(
  feature: JsonUiFeature,
  path: string,
  diagnostics: JsonUiProfileDiagnostic[]
): void {
  addProfileDiagnostic(
    {
      code: JsonUiProfileDiagnosticCode.UnsupportedFeature,
      feature,
      message: `JsonUI feature "${feature}" is not supported by this profile.`,
      path
    },
    diagnostics
  );
}
