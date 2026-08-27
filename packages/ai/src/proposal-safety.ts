import { UiPatchDiagnosticCode, type UiPatchDiagnostic } from "./types.js";

const MAXIMUM_PROPOSAL_BYTES = 1_048_576;
const MAXIMUM_PROPOSAL_DEPTH = 64;
const MAXIMUM_PROPOSAL_STRING_BYTES = 65_536;
const MAXIMUM_PROPOSAL_VALUES = 50_000;
const unsafeKeys = new Set(["__proto__", "constructor", "prototype"]);
const encoder = new TextEncoder();

interface PendingValue {
  readonly depth: number;
  readonly path: string;
  readonly value: unknown;
}

interface InspectionState {
  bytes: number;
  count: number;
  readonly pending: PendingValue[];
  readonly seen: WeakSet<object>;
}

export function proposalSafetyDiagnostic(value: unknown): UiPatchDiagnostic | undefined {
  const state: InspectionState = {
    bytes: 0,
    count: 0,
    pending: [{ depth: 0, path: "/", value }],
    seen: new WeakSet()
  };
  while (state.pending.length > 0) {
    const violation = inspectPending(state.pending.pop() as PendingValue, state);
    if (violation !== undefined) return violation;
  }
  return undefined;
}

function inspectPending(
  current: PendingValue,
  state: InspectionState
): UiPatchDiagnostic | undefined {
  state.count += 1;
  const budget = budgetViolation(current, state);
  return budget ?? inspectValue(current, state);
}

function budgetViolation(
  current: PendingValue,
  state: InspectionState
): UiPatchDiagnostic | undefined {
  if (current.depth > MAXIMUM_PROPOSAL_DEPTH) return invalid(current.path, "depth budget");
  if (state.count > MAXIMUM_PROPOSAL_VALUES) return invalid(current.path, "value budget");
  return undefined;
}

function inspectValue(
  current: PendingValue,
  state: InspectionState
): UiPatchDiagnostic | undefined {
  if (current.value === null) return addBytes(state, 4, current.path);
  const scalar = scalarInspectors[typeof current.value];
  if (scalar !== undefined) return scalar(current.value, current.path, state);
  return inspectObject(current, state);
}

type ScalarInspector = (
  value: unknown,
  path: string,
  state: InspectionState
) => UiPatchDiagnostic | undefined;

const scalarInspectors: Readonly<Record<string, ScalarInspector>> = {
  bigint: (_value, path) => invalid(path, "non-JSON value"),
  boolean: (value, path, state) => addBytes(state, String(value).length, path),
  function: (_value, path) => invalid(path, "non-JSON value"),
  number: inspectNumber,
  string: inspectString,
  symbol: (_value, path) => invalid(path, "non-JSON value"),
  undefined: (_value, path) => invalid(path, "non-JSON value")
};

function inspectNumber(
  value: unknown,
  path: string,
  state: InspectionState
): UiPatchDiagnostic | undefined {
  if (!Number.isFinite(value)) return invalid(path, "non-finite number");
  return addBytes(state, String(value).length, path);
}

function inspectString(
  value: unknown,
  path: string,
  state: InspectionState
): UiPatchDiagnostic | undefined {
  const bytes = encodedBytes(value as string);
  if (bytes > MAXIMUM_PROPOSAL_STRING_BYTES) return invalid(path, "string budget");
  return addBytes(state, bytes + 2, path);
}

function inspectObject(
  current: PendingValue,
  state: InspectionState
): UiPatchDiagnostic | undefined {
  const value = current.value as object;
  if (state.seen.has(value)) return invalid(current.path, "cyclic or shared value");
  state.seen.add(value);
  if (Array.isArray(value)) return enqueueArray(value, current, state);
  return enqueueRecord(value, current, state);
}

function enqueueArray(
  value: readonly unknown[],
  current: PendingValue,
  state: InspectionState
): UiPatchDiagnostic | undefined {
  const violation = addBytes(state, 2 + Math.max(0, value.length - 1), current.path);
  if (violation !== undefined) return violation;
  value.forEach((item, index) => state.pending.push(child(item, String(index), current)));
  return undefined;
}

function enqueueRecord(
  value: object,
  current: PendingValue,
  state: InspectionState
): UiPatchDiagnostic | undefined {
  if (!isPlainObject(value)) return invalid(current.path, "non-plain object");
  const entries = Object.entries(value);
  const violation = addRecordBytes(entries, current.path, state);
  if (violation !== undefined) return violation;
  entries.forEach(([key, item]) => state.pending.push(child(item, key, current)));
  return undefined;
}

function addRecordBytes(
  entries: readonly (readonly [string, unknown])[],
  path: string,
  state: InspectionState
): UiPatchDiagnostic | undefined {
  const base = 2 + Math.max(0, entries.length - 1) + entries.length;
  const baseViolation = addBytes(state, base, path);
  if (baseViolation !== undefined) return baseViolation;
  return inspectKeys(
    entries.map(([key]) => key),
    path,
    state
  );
}

function inspectKeys(
  keys: readonly string[],
  path: string,
  state: InspectionState
): UiPatchDiagnostic | undefined {
  for (const key of keys) {
    const violation = inspectKey(key, path, state);
    if (violation !== undefined) return violation;
  }
  return undefined;
}

function inspectKey(
  key: string,
  path: string,
  state: InspectionState
): UiPatchDiagnostic | undefined {
  const keyPath = pointer(path, key);
  if (unsafeKeys.has(key)) return invalid(keyPath, "unsafe object key");
  return addBytes(state, encodedBytes(key) + 2, keyPath);
}

function addBytes(
  state: InspectionState,
  amount: number,
  path: string
): UiPatchDiagnostic | undefined {
  state.bytes += amount;
  return state.bytes > MAXIMUM_PROPOSAL_BYTES ? invalid(path, "byte budget") : undefined;
}

function child(value: unknown, key: string, parent: PendingValue): PendingValue {
  return { depth: parent.depth + 1, path: pointer(parent.path, key), value };
}

function pointer(path: string, key: string): string {
  const token = key.replaceAll("~", "~0").replaceAll("/", "~1");
  return path === "/" ? `/${token}` : `${path}/${token}`;
}

function encodedBytes(value: string): number {
  return encoder.encode(value).byteLength;
}

function isPlainObject(value: object): boolean {
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function invalid(path: string, reason: string): UiPatchDiagnostic {
  return {
    code: UiPatchDiagnosticCode.InvalidProposal,
    message: `The UI patch proposal exceeded its safe JSON boundary: ${reason}.`,
    path
  };
}
