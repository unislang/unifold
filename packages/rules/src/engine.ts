import type { JsonObject, JsonValue } from "@unislang/unifold-contracts";
import { LogicEngine, defaultMethods } from "json-logic-engine";

import { JsonLogicOperator } from "./enums.js";

const availableMethods = defaultMethods as unknown as Readonly<Record<string, unknown>>;
const methods = Object.fromEntries(
  Object.values(JsonLogicOperator).map((operator) => [operator, availableMethods[operator]])
);

const engine = new LogicEngine(methods, {
  disableInline: true,
  disableInterpretedOptimization: true,
  maxArrayLength: 64,
  maxDepth: 32,
  maxStringLength: 65_536,
  permissive: false
});

export function runJsonLogic(expression: JsonValue, data: JsonObject): JsonValue {
  const result: unknown = engine.run(expression, data);
  if (!isJsonSafe(result)) throw new Error("JSON Logic produced a non-JSON result.");
  return result;
}

function isJsonSafe(value: unknown): value is JsonValue {
  const pending: unknown[] = [value];
  const seen = new WeakSet<object>();
  while (pending.length > 0) {
    const current = pending.pop();
    if (!isJsonItem(current, pending, seen)) return false;
  }
  return true;
}

function isJsonItem(current: unknown, pending: unknown[], seen: WeakSet<object>): boolean {
  const primitive = jsonPrimitiveStatus(current);
  if (primitive !== undefined) return primitive;
  return addJsonStructure(current, pending, seen);
}

function jsonPrimitiveStatus(value: unknown): boolean | undefined {
  if (value === null) return true;
  if (new Set(["boolean", "string"]).has(typeof value)) return true;
  return numberStatus(value);
}

function numberStatus(value: unknown): boolean | undefined {
  return typeof value === "number" ? Number.isFinite(value) : undefined;
}

function addJsonStructure(current: unknown, pending: unknown[], seen: WeakSet<object>): boolean {
  if (!isPlainObjectOrArray(current)) return false;
  if (seen.has(current)) return false;
  seen.add(current);
  pending.push(...structureValues(current));
  return true;
}

function isPlainObjectOrArray(value: unknown): value is object {
  return Array.isArray(value) || isPlainObject(value);
}

function isPlainObject(value: unknown): value is object {
  if (value === null) return false;
  if (typeof value !== "object") return false;
  const prototype = Object.getPrototypeOf(value) as unknown;
  return new Set<unknown>([Object.prototype, null]).has(prototype);
}

function structureValues(value: object): readonly unknown[] {
  return Array.isArray(value) ? value : Object.values(value);
}
