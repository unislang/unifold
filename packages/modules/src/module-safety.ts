import { UiModuleDiagnosticCode, type UiModuleDiagnostic } from "./types.js";

const MAXIMUM_MODULE_BYTES = 1_048_576;
const MAXIMUM_MODULE_DEPTH = 64;
const MAXIMUM_MODULE_VALUES = 50_000;
const MAXIMUM_MODULE_STRING_BYTES = 65_536;
const forbiddenKeys = new Set(["__proto__", "constructor", "prototype"]);

interface PendingValue {
  readonly depth: number;
  readonly path: string;
  readonly value: unknown;
}

interface InspectionState {
  count: number;
  readonly pending: PendingValue[];
  readonly sourceId: string | undefined;
  readonly visited: WeakSet<object>;
}

export function moduleSafetyDiagnostic(
  value: unknown,
  sourceId?: string
): UiModuleDiagnostic | undefined {
  const structural = inspectStructure(value, sourceId);
  if (structural !== undefined) return structural;
  return encodedLimitDiagnostic(value, sourceId);
}

function inspectStructure(value: unknown, sourceId: string | undefined) {
  const state: InspectionState = {
    count: 0,
    pending: [{ depth: 0, path: "/", value }],
    sourceId,
    visited: new WeakSet<object>()
  };
  while (state.pending.length > 0) {
    const diagnostic = inspectNext(state);
    if (diagnostic !== undefined) return diagnostic;
  }
  return undefined;
}

function inspectNext(state: InspectionState): UiModuleDiagnostic | undefined {
  const item = state.pending.pop() as PendingValue;
  const diagnostic = inspectPending(item, state.pending, state.visited, state.sourceId);
  if (diagnostic !== undefined) return diagnostic;
  state.count += 1;
  return valueCountDiagnostic(state.count, state.sourceId);
}

function valueCountDiagnostic(count: number, sourceId: string | undefined) {
  return count > MAXIMUM_MODULE_VALUES
    ? limit("Module value limit exceeded.", "/", sourceId)
    : undefined;
}

function inspectPending(
  item: PendingValue,
  pending: PendingValue[],
  visited: WeakSet<object>,
  sourceId: string | undefined
): UiModuleDiagnostic | undefined {
  const boundary = boundaryDiagnostic(item, sourceId);
  if (boundary.handled) return boundary.diagnostic;
  return inspectContainer(item, pending, visited, sourceId);
}

interface BoundaryResult {
  readonly diagnostic: UiModuleDiagnostic | undefined;
  readonly handled: boolean;
}

function boundaryDiagnostic(item: PendingValue, sourceId: string | undefined): BoundaryResult {
  if (item.depth > MAXIMUM_MODULE_DEPTH) {
    return {
      diagnostic: limit("Module depth limit exceeded.", item.path, sourceId),
      handled: true
    };
  }
  if (typeof item.value === "string") {
    return { diagnostic: stringDiagnostic(item.value, item.path, sourceId), handled: true };
  }
  return primitiveBoundary(item, sourceId);
}

function primitiveBoundary(item: PendingValue, sourceId: string | undefined): BoundaryResult {
  if (isContainer(item.value)) return { diagnostic: undefined, handled: false };
  return { diagnostic: primitiveDiagnostic(item.value, item.path, sourceId), handled: true };
}

function inspectContainer(
  item: PendingValue,
  pending: PendingValue[],
  visited: WeakSet<object>,
  sourceId: string | undefined
): UiModuleDiagnostic | undefined {
  const value = item.value as object;
  if (visited.has(value))
    return unsafe("Module contains a cycle or shared object.", item.path, sourceId);
  visited.add(value);
  return enqueueContainer(item, pending, sourceId);
}

function enqueueContainer(
  item: PendingValue,
  pending: PendingValue[],
  sourceId: string | undefined
): UiModuleDiagnostic | undefined {
  const value = item.value as object;
  if (Array.isArray(value)) {
    enqueueEntries(value.entries(), item, pending);
    return undefined;
  }
  return enqueueObject(value, item, pending, sourceId);
}

function enqueueObject(
  value: object,
  item: PendingValue,
  pending: PendingValue[],
  sourceId: string | undefined
): UiModuleDiagnostic | undefined {
  if (!isPlainObject(value)) {
    return unsafe("Module values must be plain JSON objects.", item.path, sourceId);
  }
  const forbidden = Object.keys(value).find((key) => forbiddenKeys.has(key));
  if (forbidden !== undefined)
    return unsafe(
      "Module contains a prototype-sensitive key.",
      childPath(item.path, forbidden),
      sourceId
    );
  enqueueEntries(Object.entries(value), item, pending);
  return undefined;
}

function enqueueEntries(
  entries: Iterable<readonly [string | number, unknown]>,
  parent: PendingValue,
  pending: PendingValue[]
): void {
  for (const [name, value] of entries) {
    pending.push({ depth: parent.depth + 1, path: childPath(parent.path, String(name)), value });
  }
}

function primitiveDiagnostic(value: unknown, path: string, sourceId: string | undefined) {
  if (value === null || typeof value === "boolean") return undefined;
  return numberDiagnostic(value, path, sourceId);
}

function numberDiagnostic(value: unknown, path: string, sourceId: string | undefined) {
  return typeof value === "number" && Number.isFinite(value)
    ? undefined
    : unsafe("Module contains a non-JSON value.", path, sourceId);
}

function stringDiagnostic(value: string, path: string, sourceId: string | undefined) {
  return new TextEncoder().encode(value).byteLength <= MAXIMUM_MODULE_STRING_BYTES
    ? undefined
    : limit("Module string limit exceeded.", path, sourceId);
}

function encodedLimitDiagnostic(value: unknown, sourceId: string | undefined) {
  const bytes = new TextEncoder().encode(JSON.stringify(value)).byteLength;
  return bytes <= MAXIMUM_MODULE_BYTES
    ? undefined
    : limit("Encoded module byte limit exceeded.", "/", sourceId);
}

function isContainer(value: unknown): value is object {
  return value !== null && typeof value === "object";
}

function isPlainObject(value: object): value is Record<string, unknown> {
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function childPath(parent: string, name: string): string {
  const token = name.replaceAll("~", "~0").replaceAll("/", "~1");
  return parent === "/" ? `/${token}` : `${parent}/${token}`;
}

function limit(message: string, path: string, sourceId: string | undefined) {
  return diagnostic(UiModuleDiagnosticCode.ModuleLimitExceeded, message, path, sourceId);
}

function unsafe(message: string, path: string, sourceId: string | undefined) {
  return diagnostic(UiModuleDiagnosticCode.UnsafeValue, message, path, sourceId);
}

function diagnostic(
  code: UiModuleDiagnosticCode,
  message: string,
  path: string,
  sourceId: string | undefined
): UiModuleDiagnostic {
  return { code, message, path, ...(sourceId === undefined ? {} : { sourceId }) };
}
