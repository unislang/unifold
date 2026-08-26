import type { JsonObject } from "@unislang/unifold-contracts";

interface JsonBudget {
  members: number;
}

type UnknownRecord = Record<string, unknown>;

const dangerousKeys = new Set(["__proto__", "constructor", "prototype"]);

export function isSafeJsonObject(value: unknown): value is JsonObject {
  if (!isPlainRecord(value)) return false;
  return visitJson(value, 0, { members: 0 });
}

export function isSafeJson(value: unknown): boolean {
  return visitJson(value, 0, { members: 0 });
}

export function isPlainRecord(value: unknown): value is UnknownRecord {
  const recordCandidate = [value !== null, typeof value === "object", !Array.isArray(value)];
  if (!recordCandidate.every(Boolean)) return false;
  const prototype = Object.getPrototypeOf(value) as object | null;
  return prototype === null || prototype === Object.prototype;
}

export function jsonByteLength(value: unknown): number {
  try {
    return new TextEncoder().encode(JSON.stringify(value)).byteLength;
  } catch {
    return Number.POSITIVE_INFINITY;
  }
}

function visitJson(value: unknown, depth: number, budget: JsonBudget): boolean {
  const primitive = jsonPrimitiveStatus(value);
  if (primitive !== undefined) return primitive;
  return visitContainer(value, depth, budget);
}

function visitContainer(value: unknown, depth: number, budget: JsonBudget): boolean {
  if (depth >= 32) return false;
  if (Array.isArray(value)) return visitChildren(value, depth, budget);
  return visitObject(value, depth, budget);
}

function visitObject(value: unknown, depth: number, budget: JsonBudget): boolean {
  if (!isPlainRecord(value)) return false;
  if (Object.keys(value).some((key) => dangerousKeys.has(key))) return false;
  return visitChildren(Object.values(value), depth, budget);
}

function jsonPrimitiveStatus(value: unknown): boolean | undefined {
  if (value === null) return true;
  return nonNullPrimitiveStatus(value);
}

function nonNullPrimitiveStatus(value: unknown): boolean | undefined {
  const type = typeof value;
  if (type === "number") return Number.isFinite(value);
  return ["boolean", "string"].includes(type) ? true : undefined;
}

function visitChildren(children: readonly unknown[], depth: number, budget: JsonBudget): boolean {
  budget.members += children.length;
  if (budget.members > 20_000) return false;
  return children.every((child) => visitJson(child, depth + 1, budget));
}
