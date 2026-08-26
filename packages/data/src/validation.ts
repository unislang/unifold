import { DataClassification } from "@unislang/unifold-contracts";

import { isBoundedJson, isBoundedJsonObject, isPlainRecord, jsonBytes } from "./json-safety.js";
import { isDataOperationId } from "./registry.js";
import {
  DataOfflineBehavior,
  DataOperationKind,
  DataProtocolVersion,
  DataResultStatus,
  DataSortDirection,
  type DataRequest,
  type DataResult
} from "./types.js";

type UnknownRecord = Record<string, unknown>;
type RequestCheck = readonly [name: string, validate: (value: UnknownRecord) => boolean];

const safeIdPattern = /^(?!__proto__$|constructor$|prototype$)[A-Za-z0-9][A-Za-z0-9._:-]*$/u;
const maximumRequestBytes = 262_144;
const queryKeys = new Set([
  "cache",
  "correlationId",
  "filter",
  "kind",
  "operationId",
  "page",
  "protocolVersion",
  "requestId",
  "sort",
  "timeoutMs",
  "variables"
]);
const mutationKeys = new Set([
  "correlationId",
  "expectedRevision",
  "filter",
  "idempotencyKey",
  "invalidateTags",
  "kind",
  "operationId",
  "protocolVersion",
  "requestId",
  "sort",
  "timeoutMs",
  "variables"
]);
const cacheKeys = new Set(["freshForMs", "offline", "retainForMs"]);
const pageKeys = new Set(["after", "before", "limit"]);
const sortKeys = new Set(["direction", "field"]);
const successKeys = new Set([
  "classification",
  "data",
  "invalidationTags",
  "nextCursor",
  "previousCursor",
  "receivedAt",
  "revision",
  "status"
]);
const emptyKeys = new Set([
  "classification",
  "invalidationTags",
  "receivedAt",
  "revision",
  "status"
]);
const failureKeys = new Set(["error", "status"]);
const errorKeys = new Set(["code", "details", "messageKey", "retryAfterMs"]);

const baseChecks: readonly RequestCheck[] = [
  ["unknown property", (value) => exactKeys(value, allowedRequestKeys(value))],
  ["protocolVersion", (value) => value["protocolVersion"] === DataProtocolVersion.Version1],
  [
    "kind",
    (value) => Object.values(DataOperationKind).includes(value["kind"] as DataOperationKind)
  ],
  ["identity", validIdentity],
  ["operationId", validOperation],
  ["variables", (value) => isBoundedJsonObject(value["variables"])],
  ["filter", (value) => optionalJsonObject(value["filter"])],
  ["sort", (value) => validSort(value["sort"])],
  ["timeoutMs", (value) => optionalInteger(value["timeoutMs"], 1, 120_000)],
  ["size", (value) => jsonBytes(value) <= maximumRequestBytes]
];
const queryChecks: readonly RequestCheck[] = [
  ["cache", (value) => validCache(value["cache"])],
  ["page", (value) => validPage(value["page"])]
];
const mutationChecks: readonly RequestCheck[] = [
  ["idempotencyKey", (value) => boundedId(value["idempotencyKey"])],
  ["invalidateTags", (value) => validTags(value["invalidateTags"])],
  ["expectedRevision", (value) => optionalBoundedString(value["expectedRevision"], 256)]
];

export function dataRequestErrors(value: unknown): readonly string[] {
  if (!isRecord(value)) return ["request must be a plain object"];
  return requestChecks(value)
    .filter(([, validate]) => !validate(value))
    .map(([name]) => name);
}

export function isDataRequest(value: unknown): value is DataRequest {
  return dataRequestErrors(value).length === 0;
}

export function isDataResult(value: unknown): value is DataResult {
  if (!isRecord(value)) return false;
  return validateKnownResult(value);
}

function requestChecks(value: UnknownRecord): readonly RequestCheck[] {
  const specific = value["kind"] === DataOperationKind.Query ? queryChecks : mutationChecks;
  return [...baseChecks, ...specific];
}

function allowedRequestKeys(value: UnknownRecord): ReadonlySet<string> {
  return value["kind"] === DataOperationKind.Query ? queryKeys : mutationKeys;
}

function validIdentity(value: UnknownRecord): boolean {
  return all([boundedId(value["requestId"]), boundedId(value["correlationId"])]);
}

function validOperation(value: UnknownRecord): boolean {
  const operationId = value["operationId"];
  if (typeof operationId !== "string") return false;
  return isDataOperationId(operationId);
}

function validCache(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return all([
    exactKeys(value, cacheKeys),
    integer(value["freshForMs"], 0, 3_600_000),
    integer(value["retainForMs"], 0, 86_400_000),
    Object.values(DataOfflineBehavior).includes(value["offline"] as DataOfflineBehavior),
    Number(value["retainForMs"]) >= Number(value["freshForMs"])
  ]);
}

function validPage(value: unknown): boolean {
  if (value === undefined) return true;
  return validPresentPage(value);
}

function validPresentPage(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return all([
    exactKeys(value, pageKeys),
    integer(value["limit"], 1, 1_000),
    optionalBoundedString(value["after"], 512),
    optionalBoundedString(value["before"], 512),
    [value["after"] === undefined, value["before"] === undefined].some(Boolean)
  ]);
}

function validTags(value: unknown): boolean {
  if (!stringList(value, 64)) return false;
  return new Set(value).size === value.length;
}

function validSort(value: unknown): boolean {
  if (value === undefined) return true;
  return validSortList(value);
}

function validSortList(value: unknown): boolean {
  if (!Array.isArray(value)) return false;
  return all([value.length <= 16, value.every(validSortItem)]);
}

function validSortItem(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return all([
    exactKeys(value, sortKeys),
    boundedString(value["field"], 128),
    Object.values(DataSortDirection).includes(value["direction"] as DataSortDirection)
  ]);
}

const resultValidators = new Map<string, (value: UnknownRecord) => boolean>([
  [DataResultStatus.Success, validSuccessResult],
  [DataResultStatus.Empty, validEmptyResult],
  ...Object.values(DataResultStatus)
    .filter((status) => status !== DataResultStatus.Success && status !== DataResultStatus.Empty)
    .map((status) => [status, validFailureResult] as const)
]);

function validateKnownResult(value: UnknownRecord): boolean {
  const validate = resultValidators.get(String(value["status"]));
  return validate === undefined ? false : validate(value);
}

function validSuccessResult(value: UnknownRecord): boolean {
  return all([
    exactKeys(value, successKeys),
    validCacheableResult(value),
    isBoundedJson(value["data"]),
    optionalBoundedString(value["nextCursor"], 512),
    optionalBoundedString(value["previousCursor"], 512)
  ]);
}

function validEmptyResult(value: UnknownRecord): boolean {
  return all([exactKeys(value, emptyKeys), validCacheableResult(value)]);
}

function validCacheableResult(value: UnknownRecord): boolean {
  return all([
    Object.values(DataClassification).includes(value["classification"] as DataClassification),
    isoTimestamp(value["receivedAt"]),
    validTags(value["invalidationTags"]),
    optionalBoundedString(value["revision"], 256)
  ]);
}

function validFailureResult(value: UnknownRecord): boolean {
  const error = value["error"];
  if (!isRecord(error)) return false;
  return all([
    exactKeys(value, failureKeys),
    exactKeys(error, errorKeys),
    boundedString(error["code"], 128),
    boundedString(error["messageKey"], 256),
    optionalInteger(error["retryAfterMs"], 0, 300_000),
    optionalJsonObject(error["details"])
  ]);
}

function optionalJsonObject(value: unknown): boolean {
  if (value === undefined) return true;
  return isBoundedJsonObject(value);
}

function isRecord(value: unknown): value is UnknownRecord {
  return isPlainRecord(value);
}

function exactKeys(value: UnknownRecord, allowed: ReadonlySet<string>): boolean {
  return Object.keys(value).every((key) => allowed.has(key));
}

function boundedId(value: unknown): value is string {
  return typeof value === "string" && value.length <= 128 && safeIdPattern.test(value);
}

function boundedString(value: unknown, maximum: number): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= maximum;
}

function optionalBoundedString(value: unknown, maximum: number): boolean {
  return value === undefined || boundedString(value, maximum);
}

function integer(value: unknown, minimum: number, maximum: number): value is number {
  return Number.isInteger(value) && (value as number) >= minimum && (value as number) <= maximum;
}

function optionalInteger(value: unknown, minimum: number, maximum: number): boolean {
  return value === undefined || integer(value, minimum, maximum);
}

function stringList(value: unknown, maximum: number): value is readonly string[] {
  if (!Array.isArray(value)) return false;
  return all([value.length <= maximum, value.every((item) => boundedId(item))]);
}

function isoTimestamp(value: unknown): boolean {
  if (typeof value !== "string") return false;
  return validTimestampString(value);
}

function validTimestampString(value: string): boolean {
  const match =
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,9})?(?:Z|[+-](\d{2}):(\d{2}))$/u.exec(
      value
    );
  if (match === null) return false;
  return validTimestampParts(value, match);
}

function validTimestampParts(value: string, match: RegExpExecArray): boolean {
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const maximumDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return all([
    month >= 1,
    month <= 12,
    day >= 1,
    day <= maximumDay,
    Number(match[4]) <= 23,
    Number(match[5]) <= 59,
    Number(match[6]) <= 59,
    Number(match[7] ?? 0) <= 23,
    Number(match[8] ?? 0) <= 59,
    Number.isFinite(Date.parse(value))
  ]);
}

function all(values: readonly boolean[]): boolean {
  return values.every(Boolean);
}
