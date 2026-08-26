import type { CompositionDiagnostic } from "./types.js";

import { CompositionDiagnosticCode } from "./enums.js";
import { addLayoutDiagnostic } from "./layout-values.js";

const MAX_LAYOUT_DEPTH = 64;
const MAX_LAYOUT_VALUES = 50_000;
const MAX_LAYOUT_STRING_LENGTH = 65_536;
const unsafeKeys = new Set(["__proto__", "constructor", "prototype"]);

interface PendingValue {
  readonly depth: number;
  readonly path: string;
  readonly value: unknown;
}

export function validateLayoutJson(value: unknown, diagnostics: CompositionDiagnostic[]): boolean {
  return validateLayoutJsonAt(value, diagnostics, "/");
}

export function validateLayoutJsonAt(
  value: unknown,
  diagnostics: CompositionDiagnostic[],
  rootPath: string
): boolean {
  const pending: PendingValue[] = [{ depth: 0, path: rootPath, value }];
  const seen = new WeakSet<object>();
  let count = 0;
  while (pending.length > 0) {
    const current = pending.pop() as PendingValue;
    count += 1;
    if (!validatePending(current, count, pending, seen, diagnostics)) return false;
  }
  return true;
}

function validatePending(
  current: PendingValue,
  count: number,
  pending: PendingValue[],
  seen: WeakSet<object>,
  diagnostics: CompositionDiagnostic[]
): boolean {
  const violation = budgetViolation(current, count);
  if (violation !== undefined) return reject(diagnostics, current.path, violation);
  return validateValue(current, pending, seen, diagnostics);
}

function budgetViolation(current: PendingValue, count: number): string | undefined {
  if (count > MAX_LAYOUT_VALUES) return "Layout exceeds the 50,000-value budget.";
  if (current.depth > MAX_LAYOUT_DEPTH) return "Layout exceeds the 64-level depth budget.";
  return undefined;
}

function validateValue(
  current: PendingValue,
  pending: PendingValue[],
  seen: WeakSet<object>,
  diagnostics: CompositionDiagnostic[]
): boolean {
  if (current.value === null) return true;
  const scalar = scalarValidators[typeof current.value];
  if (scalar !== undefined) return scalar(current.value, current.path, diagnostics);
  return validateObject(current, pending, seen, diagnostics);
}

type ScalarValidator = (
  value: unknown,
  path: string,
  diagnostics: CompositionDiagnostic[]
) => boolean;

const scalarValidators: Readonly<Record<string, ScalarValidator>> = {
  bigint: rejectJsonScalar,
  boolean: () => true,
  function: rejectJsonScalar,
  number: (value, path, diagnostics) =>
    Number.isFinite(value) || reject(diagnostics, path, "Layout numbers must be finite."),
  string: (value, path, diagnostics) =>
    String(value).length <= MAX_LAYOUT_STRING_LENGTH ||
    reject(diagnostics, path, "Layout strings cannot exceed 65,536 characters."),
  symbol: rejectJsonScalar,
  undefined: rejectJsonScalar
};

function validateObject(
  current: PendingValue,
  pending: PendingValue[],
  seen: WeakSet<object>,
  diagnostics: CompositionDiagnostic[]
): boolean {
  const value = current.value as object;
  if (seen.has(value))
    return reject(diagnostics, current.path, "Layout values cannot be cyclic or shared.");
  seen.add(value);
  return enqueueContainer(current, pending, diagnostics);
}

function enqueueContainer(
  current: PendingValue,
  pending: PendingValue[],
  diagnostics: CompositionDiagnostic[]
): boolean {
  const value = current.value as object;
  if (Array.isArray(value)) return enqueueArray(value, current, pending);
  return enqueuePlainObject(value, current, pending, diagnostics);
}

function enqueuePlainObject(
  value: object,
  current: PendingValue,
  pending: PendingValue[],
  diagnostics: CompositionDiagnostic[]
): boolean {
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null)
    return reject(diagnostics, current.path, "Layout objects must be plain JSON objects.");
  return enqueueObject(value as Record<string, unknown>, current, pending, diagnostics);
}

function enqueueArray(
  value: readonly unknown[],
  current: PendingValue,
  pending: PendingValue[]
): true {
  value.forEach((item, index) => pending.push(child(item, index, current.path, current.depth)));
  return true;
}

function rejectJsonScalar(
  _value: unknown,
  path: string,
  diagnostics: CompositionDiagnostic[]
): false {
  return reject(diagnostics, path, "Layout values must be JSON-safe data.");
}

function enqueueObject(
  value: Record<string, unknown>,
  current: PendingValue,
  pending: PendingValue[],
  diagnostics: CompositionDiagnostic[]
): boolean {
  for (const [key, item] of Object.entries(value)) {
    const path = pointer(current.path, key);
    if (unsafeKeys.has(key)) return reject(diagnostics, path, `Unsafe layout key "${key}".`);
    pending.push({ depth: current.depth + 1, path, value: item });
  }
  return true;
}

function child(value: unknown, index: number, path: string, depth: number): PendingValue {
  return { depth: depth + 1, path: pointer(path, String(index)), value };
}

function pointer(path: string, segment: string): string {
  const escaped = segment.replaceAll("~", "~0").replaceAll("/", "~1");
  return path === "/" ? `/${escaped}` : `${path}/${escaped}`;
}

function reject(diagnostics: CompositionDiagnostic[], path: string, message: string): false {
  addLayoutDiagnostic(diagnostics, CompositionDiagnosticCode.InvalidLayout, path, message);
  return false;
}
