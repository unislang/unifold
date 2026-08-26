import type { JsonObject } from "@unislang/unifold-contracts";

type UnknownRecord = Record<string, unknown>;
interface JsonBudget {
  members: number;
}

const dangerousJsonKeys = new Set(["__proto__", "constructor", "prototype"]);
const maximumJsonDepth = 32;
const maximumJsonMembers = 10_000;

export function isBoundedJsonObject(value: unknown): value is JsonObject {
  if (!isPlainRecord(value)) return false;
  return isBoundedJson(value);
}

export function isBoundedJson(value: unknown): boolean {
  return visitJson(value, 0, { members: 0 });
}

export function isPlainRecord(value: unknown): value is UnknownRecord {
  if (value === null) return false;
  if (typeof value !== "object") return false;
  return isPlainNonArray(value);
}

export function jsonBytes(value: unknown): number {
  try {
    return new TextEncoder().encode(JSON.stringify(value)).byteLength;
  } catch {
    return Number.POSITIVE_INFINITY;
  }
}

function visitJson(value: unknown, depth: number, budget: JsonBudget): boolean {
  if (isJsonPrimitive(value)) return validJsonPrimitive(value);
  return visitJsonContainer(value, depth, budget);
}

function isJsonPrimitive(value: unknown): boolean {
  return value === null || ["boolean", "number", "string"].includes(typeof value);
}

function validJsonPrimitive(value: unknown): boolean {
  if (typeof value === "number") return Number.isFinite(value);
  return true;
}

function visitJsonContainer(value: unknown, depth: number, budget: JsonBudget): boolean {
  if (Array.isArray(value)) return visitJsonChildren(value, depth, budget);
  return visitJsonObject(value, depth, budget);
}

function visitJsonObject(value: unknown, depth: number, budget: JsonBudget): boolean {
  if (!isPlainRecord(value)) return false;
  if (Object.keys(value).some((key) => dangerousJsonKeys.has(key))) return false;
  return visitJsonChildren(Object.values(value), depth, budget);
}

function visitJsonChildren(
  children: readonly unknown[],
  depth: number,
  budget: JsonBudget
): boolean {
  if (depth >= maximumJsonDepth) return false;
  budget.members += children.length;
  if (budget.members > maximumJsonMembers) return false;
  return children.every((child) => visitJson(child, depth + 1, budget));
}

function isPlainNonArray(value: object): value is UnknownRecord {
  if (Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value) as object | null;
  return prototype === null || prototype === Object.prototype;
}
