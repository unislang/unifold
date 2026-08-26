import type { JsonObject, JsonValue } from "@unislang/unifold-contracts";

import {
  ControlPlaneOperation,
  ControlPlaneProtocolVersion,
  type ControlPlaneBackupRequest,
  type ControlPlaneCommitDocumentRequest,
  type ControlPlaneInvokeEffectRequest,
  type ControlPlaneReadDocumentRequest,
  type ControlPlaneRestoreRequest,
  type ControlPlaneResumeRealtimeRequest
} from "./types.js";

export type ControlPlaneWireRequest =
  | ControlPlaneBackupRequest
  | ControlPlaneCommitDocumentRequest
  | ControlPlaneInvokeEffectRequest
  | ControlPlaneReadDocumentRequest
  | ControlPlaneRestoreRequest
  | ControlPlaneResumeRealtimeRequest;

const baseKeys = [
  "correlationId",
  "operation",
  "protocolVersion",
  "requestId",
  "sessionToken",
  "traceparent"
] as const;

const operationKeys: Readonly<Record<ControlPlaneOperation, readonly string[]>> = Object.freeze({
  [ControlPlaneOperation.BackupCreate]: baseKeys,
  [ControlPlaneOperation.BackupRestore]: [...baseKeys, "backupId"],
  [ControlPlaneOperation.DocumentCommit]: [...baseKeys, "document", "expectedRevision", "objectId"],
  [ControlPlaneOperation.DocumentRead]: [...baseKeys, "objectId"],
  [ControlPlaneOperation.EffectInvoke]: [
    ...baseKeys,
    "effectId",
    "idempotencyKey",
    "input",
    "objectId"
  ],
  [ControlPlaneOperation.RealtimeResume]: [...baseKeys, "afterSequence"]
});

const operations = new Set<string>(Object.values(ControlPlaneOperation));
const unsafeKeys = new Set(["__proto__", "constructor", "prototype"]);
const maximumDepth = 32;
const maximumMembers = 20_000;

export function decodeControlPlaneRequest(value: unknown): ControlPlaneWireRequest | undefined {
  if (!isRecord(value)) return undefined;
  return decodeRequestRecord(value);
}

function decodeRequestRecord(value: JsonObject): ControlPlaneWireRequest | undefined {
  const operation = decodedOperation(value["operation"]);
  if (operation === undefined) return undefined;
  return validRequestRecord(value, operation)
    ? (value as unknown as ControlPlaneWireRequest)
    : undefined;
}

function validBase(value: JsonObject, operation: ControlPlaneOperation): boolean {
  const traceparent = value["traceparent"];
  return [
    value["protocolVersion"] === ControlPlaneProtocolVersion.Version1,
    value["operation"] === operation,
    validText(value["requestId"], 128),
    validText(value["correlationId"], 128),
    validText(value["sessionToken"], 4096),
    optionalText(traceparent, 256)
  ].every(Boolean);
}

function validOperation(value: JsonObject, operation: ControlPlaneOperation): boolean {
  return operationValidators[operation](value);
}

function validCommit(value: JsonObject): boolean {
  const expected = value["expectedRevision"];
  return [
    validText(value["objectId"], 256),
    optionalText(expected, 256),
    isRecord(value["document"])
  ].every(Boolean);
}

function validEffect(value: JsonObject): boolean {
  return [
    validText(value["effectId"], 256),
    validText(value["idempotencyKey"], 256),
    validText(value["objectId"], 256),
    Object.hasOwn(value, "input")
  ].every(Boolean);
}

function exactKeys(value: JsonObject, permitted: readonly string[]): boolean {
  const allowed = new Set(permitted);
  return Object.keys(value).every((key) => allowed.has(key));
}

function validText(value: JsonValue | undefined, maximum: number): value is string {
  if (typeof value !== "string") return false;
  const length = value.trim().length;
  return length > 0 && value.length <= maximum;
}

function optionalText(value: JsonValue | undefined, maximum: number): boolean {
  return value === undefined ? true : validText(value, maximum);
}

function validSequence(value: JsonValue | undefined): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function isRecord(value: unknown): value is JsonObject {
  if (![value !== null, typeof value === "object", !Array.isArray(value)].every(Boolean)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value) as unknown;
  return [Object.prototype, null].includes(prototype as object | null);
}

export function safeJson(value: unknown): value is JsonValue {
  const budget = { members: 0 };
  return safeValue(value, 0, budget);
}

function safeValue(value: unknown, depth: number, budget: { members: number }): value is JsonValue {
  if (depth > maximumDepth) return false;
  return safeValueAtDepth(value, depth, budget);
}

function safeValueAtDepth(
  value: unknown,
  depth: number,
  budget: { members: number }
): value is JsonValue {
  const kind = jsonKind(value);
  return jsonKindValidators[kind](value, depth, budget);
}

function safeArray(value: readonly unknown[], depth: number, budget: { members: number }): boolean {
  budget.members += value.length;
  if (budget.members > maximumMembers) return false;
  return value.every((item) => safeValue(item, depth + 1, budget));
}

function safeObject(value: JsonObject, depth: number, budget: { members: number }): boolean {
  const entries = Object.entries(value);
  budget.members += entries.length;
  if (budget.members > maximumMembers) return false;
  return entries.every(([key, item]) => !unsafeKeys.has(key) && safeValue(item, depth + 1, budget));
}

function decodedOperation(value: JsonValue | undefined): ControlPlaneOperation | undefined {
  if (typeof value !== "string") return undefined;
  return operations.has(value) ? (value as ControlPlaneOperation) : undefined;
}

function validRequestRecord(value: JsonObject, operation: ControlPlaneOperation): boolean {
  return [
    safeJson(value),
    exactKeys(value, operationKeys[operation]),
    validBase(value, operation),
    validOperation(value, operation)
  ].every(Boolean);
}

const operationValidators: Readonly<Record<ControlPlaneOperation, (value: JsonObject) => boolean>> =
  Object.freeze({
    [ControlPlaneOperation.BackupCreate]: () => true,
    [ControlPlaneOperation.BackupRestore]: (value) => validText(value["backupId"], 256),
    [ControlPlaneOperation.DocumentCommit]: validCommit,
    [ControlPlaneOperation.DocumentRead]: (value) => validText(value["objectId"], 256),
    [ControlPlaneOperation.EffectInvoke]: validEffect,
    [ControlPlaneOperation.RealtimeResume]: (value) => validSequence(value["afterSequence"])
  });

type JsonKind = "array" | "invalid" | "null" | "number" | "object" | "primitive";

function jsonKind(value: unknown): JsonKind {
  const match = jsonKindMatchers.find(([matches]) => matches(value));
  return match?.[1] ?? "invalid";
}

const jsonKindMatchers: readonly [(value: unknown) => boolean, Exclude<JsonKind, "invalid">][] = [
  [(value) => value === null, "null"],
  [Array.isArray, "array"],
  [(value) => typeof value === "number", "number"],
  [(value) => ["string", "boolean"].includes(typeof value), "primitive"],
  [isRecord, "object"]
];

const jsonKindValidators: Readonly<
  Record<JsonKind, (value: unknown, depth: number, budget: { members: number }) => boolean>
> = Object.freeze({
  array: (value, depth, budget) => safeArray(value as readonly unknown[], depth, budget),
  invalid: () => false,
  null: () => true,
  number: (value) => Number.isFinite(value),
  object: (value, depth, budget) => safeObject(value as JsonObject, depth, budget),
  primitive: () => true
});
