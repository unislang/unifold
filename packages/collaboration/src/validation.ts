import { isPlainRecord, isSafeJson, isSafeJsonObject, jsonByteLength } from "./json-safety.js";
import { isSafePatchPointer } from "./pointer.js";
import {
  CollaborationOperation,
  CollaborationPatchOperationType,
  CollaborationProtocolVersion,
  type CollaborationPatchOperation,
  type CollaborationRequest
} from "./types.js";

type UnknownRecord = Record<string, unknown>;
type RequestCheck = readonly [name: string, check: (value: UnknownRecord) => boolean];

const idPattern = /^(?!__proto__$|constructor$|prototype$)[A-Za-z0-9][A-Za-z0-9._:-]*$/u;
const baseKeys = ["correlationId", "operation", "protocolVersion", "requestId"];
const requestKeys = new Map<CollaborationOperation, ReadonlySet<string>>([
  [
    CollaborationOperation.Propose,
    keys(
      ...baseKeys,
      "affectedIds",
      "baseRevision",
      "branchId",
      "causationId",
      "idempotencyKey",
      "intent",
      "operations",
      "proposalId"
    )
  ],
  [CollaborationOperation.Approve, keys(...baseKeys, "expectedRevision", "proposalId")],
  [CollaborationOperation.Comment, keys(...baseKeys, "body", "proposalId")],
  [CollaborationOperation.Publish, keys(...baseKeys, "branchId", "revision")],
  [CollaborationOperation.Undo, keys(...baseKeys, "branchId", "idempotencyKey", "targetRevision")],
  [
    CollaborationOperation.Presence,
    keys(...baseKeys, "branchId", "cursor", "draft", "expiresInMs", "selectedId")
  ]
]);

const baseChecks: readonly RequestCheck[] = [
  ["unknown property", exactRequestKeys],
  [
    "protocolVersion",
    (value) => value["protocolVersion"] === CollaborationProtocolVersion.Version1
  ],
  ["operation", validOperation],
  ["requestId", (value) => boundedId(value["requestId"])],
  ["correlationId", (value) => boundedId(value["correlationId"])],
  ["size", (value) => jsonByteLength(value) <= 1_048_576]
];

export function collaborationRequestErrors(value: unknown): readonly string[] {
  if (!isPlainRecord(value)) return ["request must be a plain object"];
  return [...baseChecks, ...operationChecks(value)]
    .filter(([, check]) => !check(value))
    .map(([name]) => name);
}

export function isCollaborationRequest(value: unknown): value is CollaborationRequest {
  return collaborationRequestErrors(value).length === 0;
}

function operationChecks(value: UnknownRecord): readonly RequestCheck[] {
  return checksByOperation.get(value["operation"] as CollaborationOperation) ?? [];
}

const proposalChecks: readonly RequestCheck[] = [
  ["proposalId", (value) => boundedId(value["proposalId"])],
  ["branchId", (value) => boundedId(value["branchId"])],
  ["baseRevision", (value) => boundedId(value["baseRevision"])],
  ["idempotencyKey", (value) => boundedId(value["idempotencyKey"])],
  ["causationId", (value) => optionalId(value["causationId"])],
  ["intent", (value) => boundedText(value["intent"], 2_048)],
  ["affectedIds", (value) => validIdList(value["affectedIds"], 256)],
  ["operations", (value) => validOperations(value["operations"])]
];

const approvalChecks: readonly RequestCheck[] = [
  ["proposalId", (value) => boundedId(value["proposalId"])],
  ["expectedRevision", (value) => boundedId(value["expectedRevision"])]
];

const commentChecks: readonly RequestCheck[] = [
  ["proposalId", (value) => boundedId(value["proposalId"])],
  ["body", (value) => boundedText(value["body"], 4_096)]
];

const publishChecks: readonly RequestCheck[] = [
  ["branchId", (value) => boundedId(value["branchId"])],
  ["revision", (value) => boundedId(value["revision"])]
];

const undoChecks: readonly RequestCheck[] = [
  ["branchId", (value) => boundedId(value["branchId"])],
  ["idempotencyKey", (value) => boundedId(value["idempotencyKey"])],
  ["targetRevision", (value) => boundedId(value["targetRevision"])]
];

const presenceChecks: readonly RequestCheck[] = [
  ["branchId", (value) => boundedId(value["branchId"])],
  ["cursor", (value) => value["cursor"] === undefined || isSafeJsonObject(value["cursor"])],
  ["draft", (value) => typeof value["draft"] === "boolean"],
  ["expiresInMs", (value) => integer(value["expiresInMs"], 1_000, 120_000)],
  ["selectedId", (value) => optionalId(value["selectedId"])]
];

const checksByOperation = new Map<CollaborationOperation, readonly RequestCheck[]>([
  [CollaborationOperation.Propose, proposalChecks],
  [CollaborationOperation.Approve, approvalChecks],
  [CollaborationOperation.Comment, commentChecks],
  [CollaborationOperation.Publish, publishChecks],
  [CollaborationOperation.Undo, undoChecks],
  [CollaborationOperation.Presence, presenceChecks]
]);

function validOperations(value: unknown): value is readonly CollaborationPatchOperation[] {
  if (!Array.isArray(value)) return false;
  return [value.length > 0, value.length <= 256, value.every(validPatchOperation)].every(Boolean);
}

function validPatchOperation(value: unknown): value is CollaborationPatchOperation {
  if (!isPlainRecord(value)) return false;
  const operation = value["op"] as CollaborationPatchOperationType;
  if (!Object.values(CollaborationPatchOperationType).includes(operation)) return false;
  return patchShapeValid(value, operation);
}

function patchShapeValid(
  value: UnknownRecord,
  operation: CollaborationPatchOperationType
): boolean {
  return [
    exactPatchKeys(value, operation),
    validPath(value["path"]),
    validFrom(value, operation),
    validPatchValue(value, operation)
  ].every(Boolean);
}

function validPath(value: unknown): value is string {
  return typeof value === "string" && isSafePatchPointer(value);
}

function exactPatchKeys(value: UnknownRecord, operation: CollaborationPatchOperationType): boolean {
  const hasFrom = [
    CollaborationPatchOperationType.Copy,
    CollaborationPatchOperationType.Move
  ].includes(operation);
  const hasValue = [
    CollaborationPatchOperationType.Add,
    CollaborationPatchOperationType.Replace,
    CollaborationPatchOperationType.Test
  ].includes(operation);
  return exactKeys(
    value,
    keys("op", "path", ...(hasFrom ? ["from"] : []), ...(hasValue ? ["value"] : []))
  );
}

function validFrom(value: UnknownRecord, operation: CollaborationPatchOperationType): boolean {
  const required = [
    CollaborationPatchOperationType.Copy,
    CollaborationPatchOperationType.Move
  ].includes(operation);
  if (!required) return value["from"] === undefined;
  return typeof value["from"] === "string" && isSafePatchPointer(value["from"]);
}

function validPatchValue(
  value: UnknownRecord,
  operation: CollaborationPatchOperationType
): boolean {
  const required = [
    CollaborationPatchOperationType.Add,
    CollaborationPatchOperationType.Replace,
    CollaborationPatchOperationType.Test
  ].includes(operation);
  return required
    ? Object.hasOwn(value, "value") && isSafeJson(value["value"])
    : value["value"] === undefined;
}

function exactRequestKeys(value: UnknownRecord): boolean {
  const operation = value["operation"] as CollaborationOperation;
  const allowed = requestKeys.get(operation);
  return allowed === undefined ? false : exactKeys(value, allowed);
}

function validOperation(value: UnknownRecord): boolean {
  return Object.values(CollaborationOperation).includes(
    value["operation"] as CollaborationOperation
  );
}

function validIdList(value: unknown, maximum: number): value is readonly string[] {
  if (!Array.isArray(value)) return false;
  return [
    value.length <= maximum,
    value.every(boundedId),
    new Set(value).size === value.length
  ].every(Boolean);
}

function boundedId(value: unknown): value is string {
  return typeof value === "string" && value.length <= 128 && idPattern.test(value);
}

function optionalId(value: unknown): boolean {
  return value === undefined || boundedId(value);
}

function boundedText(value: unknown, maximum: number): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= maximum;
}

function integer(value: unknown, minimum: number, maximum: number): boolean {
  return Number.isInteger(value) && Number(value) >= minimum && Number(value) <= maximum;
}

function exactKeys(value: UnknownRecord, allowed: ReadonlySet<string>): boolean {
  return Object.keys(value).every((key) => allowed.has(key));
}

function keys(...values: readonly string[]): ReadonlySet<string> {
  return new Set(values);
}
