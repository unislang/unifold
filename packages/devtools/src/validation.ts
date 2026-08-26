import type { JsonObject } from "@unislang/unifold-contracts";

import {
  DevtoolsProtocolVersion,
  type DevtoolsPatchOperation,
  type DevtoolsReplayPlan
} from "./types.js";

type UnknownRecord = Record<string, unknown>;

const dangerousTokens = new Set(["__proto__", "constructor", "prototype"]);
const patchTypes = new Set(["add", "copy", "move", "remove", "replace", "test"]);
const fingerprintPattern = /^[a-f0-9]{64}$/u;
const maximumJsonMembers = 20_000;

export function devtoolsReplayPlanErrors(value: unknown): readonly string[] {
  if (!plainRecord(value)) return ["plan"];
  const errors = [
    diagnostic(exactKeys(value, ["frames", "initialDocument", "protocolVersion"]), "properties"),
    diagnostic(value["protocolVersion"] === DevtoolsProtocolVersion.Version1, "protocolVersion"),
    diagnostic(safeJsonObject(value["initialDocument"]), "initialDocument"),
    diagnostic(validFrames(value["frames"]), "frames")
  ];
  return errors.filter(isString);
}

export function isDevtoolsReplayPlan(value: unknown): value is DevtoolsReplayPlan {
  return devtoolsReplayPlanErrors(value).length === 0;
}

function validFrames(value: unknown): boolean {
  if (!Array.isArray(value)) return false;
  if (value.length > 10_000) return false;
  return value.every(validFrame);
}

function validFrame(value: unknown): boolean {
  if (!plainRecord(value)) return false;
  return [
    exactKeys(value, ["baseFingerprint", "expectedFingerprint", "operations", "sequence"]),
    validFingerprint(value["baseFingerprint"]),
    validFingerprint(value["expectedFingerprint"]),
    Number.isSafeInteger(value["sequence"]) && Number(value["sequence"]) > 0,
    validOperations(value["operations"])
  ].every(Boolean);
}

function validOperations(value: unknown): value is readonly DevtoolsPatchOperation[] {
  return Array.isArray(value) && value.length <= 256 && value.every(validOperation);
}

function validOperation(value: unknown): boolean {
  if (!plainRecord(value)) return false;
  const op = value["op"];
  if (!validPatchType(op)) return false;
  return validOperationShape(value, op);
}

function validOperationShape(value: UnknownRecord, op: string): boolean {
  return [
    exactKeys(value, operationKeys(op)),
    safePointer(value["path"]),
    validFrom(value, op),
    validOperationValue(value, op)
  ].every(Boolean);
}

function safePointer(value: unknown): value is string {
  if (!boundedPointer(value)) return false;
  if (!validPointerSyntax(value)) return false;
  return value
    .slice(1)
    .split("/")
    .every((token) => !dangerousTokens.has(decodeToken(token)));
}

function decodeToken(token: string): string {
  return token.replaceAll("~1", "/").replaceAll("~0", "~");
}

function safeJsonObject(value: unknown): value is JsonObject {
  return plainRecord(value) && safeJson(value, 0, { members: 0 });
}

function safeJson(value: unknown, depth: number, budget: JsonBudget): boolean {
  if (!consumeMember(budget)) return false;
  return safeJsonValue(value, depth, budget);
}

function safeJsonValue(value: unknown, depth: number, budget: JsonBudget): boolean {
  if (primitiveJson(value)) return true;
  if (typeof value === "number") return Number.isFinite(value);
  return safeJsonContainer(value, depth, budget);
}

function safeJsonContainer(value: unknown, depth: number, budget: JsonBudget): boolean {
  if (depth >= 32) return false;
  if (Array.isArray(value)) return safeJsonArray(value, depth, budget);
  return safeJsonRecord(value, depth, budget);
}

function safeJsonArray(value: unknown[], depth: number, budget: JsonBudget): boolean {
  return value.every((item) => safeJson(item, depth + 1, budget));
}

function safeJsonRecord(value: unknown, depth: number, budget: JsonBudget): boolean {
  if (!plainRecord(value)) return false;
  return Object.entries(value).every(
    ([key, item]) => !dangerousTokens.has(key) && safeJson(item, depth + 1, budget)
  );
}

function consumeMember(budget: JsonBudget): boolean {
  budget.members += 1;
  return budget.members <= maximumJsonMembers;
}

function plainRecord(value: unknown): value is UnknownRecord {
  if (!objectValue(value)) return false;
  if (Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value) as object | null;
  return allowedPrototype(prototype);
}

function allowedPrototype(value: object | null): boolean {
  return value === null || value === Object.prototype;
}

function diagnostic(valid: boolean, code: string): string | undefined {
  return valid ? undefined : code;
}

function validPatchType(value: unknown): value is string {
  return typeof value === "string" && patchTypes.has(value);
}

function operationKeys(op: string): string[] {
  const keys = ["op", "path"];
  if (operationHasFrom(op)) keys.push("from");
  if (operationHasValue(op)) keys.push("value");
  return keys;
}

function operationHasFrom(op: string): boolean {
  return ["copy", "move"].includes(op);
}

function operationHasValue(op: string): boolean {
  return ["add", "replace", "test"].includes(op);
}

function validFrom(value: UnknownRecord, op: string): boolean {
  return operationHasFrom(op) ? safePointer(value["from"]) : value["from"] === undefined;
}

function validOperationValue(value: UnknownRecord, op: string): boolean {
  if (!operationHasValue(op)) return value["value"] === undefined;
  if (!Object.hasOwn(value, "value")) return false;
  return safeJson(value["value"], 0, { members: 0 });
}

function boundedPointer(value: unknown): value is string {
  return typeof value === "string" && value.length >= 1 && value.length <= 1_024;
}

function validPointerSyntax(value: string): boolean {
  return value.startsWith("/") && !/~(?:[^01]|$)/u.test(value);
}

function primitiveJson(value: unknown): boolean {
  return [value === null, typeof value === "boolean", typeof value === "string"].some(Boolean);
}

function objectValue(value: unknown): value is object {
  return value !== null && typeof value === "object";
}

function exactKeys(value: UnknownRecord, allowed: readonly string[]): boolean {
  const keys = Object.keys(value);
  return keys.length === allowed.length && keys.every((key) => allowed.includes(key));
}

function validFingerprint(value: unknown): value is string {
  return typeof value === "string" && fingerprintPattern.test(value);
}

function isString(value: string | undefined): value is string {
  return value !== undefined;
}

interface JsonBudget {
  members: number;
}
