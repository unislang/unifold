import type { JsonValue, UiStoreDefinition } from "@unislang/unifold-contracts";
import { StoreInputStatus, validateStoreInput } from "@unislang/unifold-ir";

import type {
  UiAsyncStoreCommitCommand,
  UiAsyncStoreAdapterCommitCommand,
  UiAsyncStoreCommitResult,
  UiAsyncStoreConnectionOptions,
  UiAsyncStoreConnectionResult,
  UiAsyncStoreOperation,
  UiAsyncStoreSnapshot
} from "./async-store-types.js";
import { migrateUiStoreSnapshot } from "./store-migrations.js";

const nonCommittedStatuses = new Set<UiAsyncStoreCommitResult["status"]>([
  "cancelled",
  "conflict",
  "denied",
  "invalid",
  "unavailable"
]);

export function firstDefinedCommitResult(
  values: readonly (UiAsyncStoreCommitResult | undefined)[]
): UiAsyncStoreCommitResult | undefined {
  return values.find((value) => value !== undefined);
}

export function disposedCommitRejection(disposed: boolean): UiAsyncStoreCommitResult | undefined {
  return disposed ? commitFailure("unavailable", "store-session-disposed") : undefined;
}

export function cancelledCommitRejection(
  signal?: AbortSignal
): UiAsyncStoreCommitResult | undefined {
  return isAborted(signal) ? commitFailure("cancelled", "store-cancelled") : undefined;
}

export function revisionCommitRejection(
  snapshot: UiAsyncStoreSnapshot | undefined,
  expectedRevision: string | null
): UiAsyncStoreCommitResult | undefined {
  return snapshotRevision(snapshot) === expectedRevision
    ? undefined
    : commitFailure("conflict", "store-revision-conflict");
}

function snapshotRevision(snapshot: UiAsyncStoreSnapshot | undefined): string | null {
  return snapshot === undefined ? null : snapshot.revision;
}

export function invalidIdentityCommitRejection(
  command: UiAsyncStoreCommitCommand
): UiAsyncStoreCommitResult | undefined {
  return validExpectedRevision(command.expectedRevision) && validIdentity(command.idempotencyKey)
    ? undefined
    : commitFailure("invalid", "store-commit-identity-invalid");
}

function validExpectedRevision(value: string | null): boolean {
  return value === null || validIdentity(value);
}

export async function authorizedStoreOperation(
  definition: UiStoreDefinition,
  options: UiAsyncStoreConnectionOptions,
  operation: UiAsyncStoreOperation,
  path?: string
): Promise<boolean> {
  try {
    return await options.authorization.decide({
      classification: definition.classification,
      operation,
      ...(path === undefined ? {} : { path }),
      storeId: definition.id
    });
  } catch {
    return false;
  }
}

export function validatedSnapshot(
  definition: UiStoreDefinition,
  adapterVersion: string,
  snapshot: UiAsyncStoreSnapshot | undefined,
  options: UiAsyncStoreConnectionOptions
): UiAsyncStoreSnapshot | undefined | Error {
  try {
    const migrated = migrateOptionalSnapshot(snapshot, adapterVersion, options);
    const value = optionalSnapshotValue(migrated);
    const validation = validateStoreInput(definition, adapterVersion, value);
    return validation.status === StoreInputStatus.Valid
      ? migrated
      : new Error("Store input invalid.");
  } catch {
    return new Error("Store input invalid.");
  }
}

function migrateOptionalSnapshot(
  snapshot: UiAsyncStoreSnapshot | undefined,
  adapterVersion: string,
  options: UiAsyncStoreConnectionOptions
): UiAsyncStoreSnapshot | undefined {
  return snapshot === undefined
    ? undefined
    : migrateUiStoreSnapshot(snapshot, adapterVersion, options.migrations);
}

export function optionalSnapshotValue(
  snapshot: UiAsyncStoreSnapshot | undefined
): JsonValue | undefined {
  return snapshot === undefined ? undefined : snapshot.value;
}

export function validCandidate(
  status: StoreInputStatus,
  candidate: JsonValue
): JsonValue | undefined {
  return status === StoreInputStatus.Valid ? candidate : undefined;
}

export function sameRevision(
  candidate: UiAsyncStoreSnapshot,
  current: UiAsyncStoreSnapshot | undefined
): boolean {
  return candidate.revision === current?.revision;
}

export function isAborted(signal?: AbortSignal): boolean {
  return signal?.aborted === true;
}

export function cloneSnapshot(
  value: UiAsyncStoreSnapshot | undefined
): UiAsyncStoreSnapshot | undefined {
  if (value === undefined) return undefined;
  return structuredClone(value);
}

export function adapterCommit(
  command: UiAsyncStoreCommitCommand,
  candidate: JsonValue,
  dataVersion: string
): UiAsyncStoreAdapterCommitCommand {
  return {
    ...command,
    candidate: structuredClone(candidate),
    dataVersion,
    value: structuredClone(command.value)
  };
}

function sanitizedCommitResult(
  status: UiAsyncStoreCommitResult["status"]
): UiAsyncStoreCommitResult {
  return commitFailure(status, `store-commit-${status}`);
}

export function sanitizeAdapterCommitResult(value: unknown): UiAsyncStoreCommitResult {
  if (!isRecord(value)) return commitFailure("invalid", "store-commit-result-invalid");
  return sanitizeAdapterCommitRecord(value);
}

function sanitizeAdapterCommitRecord(
  value: Readonly<Record<string, unknown>>
): UiAsyncStoreCommitResult {
  const status = value["status"];
  if (status === "committed") {
    return { snapshot: value["snapshot"] as UiAsyncStoreSnapshot, status };
  }
  return nonCommittedStatuses.has(status as UiAsyncStoreCommitResult["status"])
    ? sanitizedCommitResult(status as UiAsyncStoreCommitResult["status"])
    : commitFailure("invalid", "store-commit-result-invalid");
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  if (typeof value !== "object") return false;
  return value !== null;
}

function validIdentity(value: string): boolean {
  return [value.length > 0, value.length <= 256, [...value].every(visibleCharacter)].every(Boolean);
}

function visibleCharacter(character: string): boolean {
  const code = character.codePointAt(0) ?? 0;
  return code > 31 && code !== 127;
}

export function commitFailure(
  status: UiAsyncStoreCommitResult["status"],
  code: string
): UiAsyncStoreCommitResult {
  return { code, status };
}

export function connectionFailure(
  status: Exclude<UiAsyncStoreConnectionResult["status"], "connected">,
  code: string
): UiAsyncStoreConnectionResult {
  return { code, status };
}
