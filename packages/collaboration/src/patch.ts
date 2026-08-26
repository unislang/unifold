import type { JsonObject } from "@unislang/unifold-contracts";
import { applyPatch, type Operation } from "rfc6902";

import { changedPaths, operationPaths, targetsFrameworkOwnedIdentity } from "./pointer.js";
import {
  CollaborationErrorCode,
  CollaborationPatchOperationType,
  type CollaborationDiagnostic,
  type CollaborationPatchOperation,
  type CollaborationValidationPort
} from "./types.js";

export interface CollaborationPatchSuccess {
  readonly changedPaths: readonly string[];
  readonly document: JsonObject;
  readonly removedPaths: readonly string[];
  readonly success: true;
}

export interface CollaborationPatchFailure {
  readonly diagnostics: readonly CollaborationDiagnostic[];
  readonly success: false;
}

export type CollaborationPatchResult = CollaborationPatchFailure | CollaborationPatchSuccess;

export function applyCollaborationPatch(
  document: JsonObject,
  operations: readonly CollaborationPatchOperation[],
  revision: string,
  validation: CollaborationValidationPort
): CollaborationPatchResult {
  const policy = patchPolicyDiagnostics(operations);
  if (policy.length > 0) return { diagnostics: policy, success: false };
  return applyPolicyApprovedPatch(document, operations, revision, validation);
}

function applyPolicyApprovedPatch(
  document: JsonObject,
  operations: readonly CollaborationPatchOperation[],
  revision: string,
  validation: CollaborationValidationPort
): CollaborationPatchResult {
  const candidate = structuredClone(document);
  const failure = applyOperations(candidate, operations);
  if (failure !== undefined) return { diagnostics: [failure], success: false };
  Reflect.set(candidate, "revision", revision);
  const diagnostics = validation.validate(candidate);
  if (diagnostics.length > 0) return { diagnostics, success: false };
  return {
    changedPaths: changedPaths(operations),
    document: freezeJson(candidate),
    removedPaths: removedPaths(operations),
    success: true
  };
}

export function patchPolicyDiagnostics(
  operations: readonly CollaborationPatchOperation[]
): readonly CollaborationDiagnostic[] {
  return operations.flatMap(operationPolicyDiagnostics);
}

function operationPolicyDiagnostics(
  operation: CollaborationPatchOperation,
  index: number
): readonly CollaborationDiagnostic[] {
  const unsafe = operationPaths(operation).find(targetsFrameworkOwnedIdentity);
  if (unsafe === undefined) return [];
  return [
    diagnostic(
      CollaborationErrorCode.InvalidPatch,
      `/operations/${index}`,
      "collaboration.patch.frameworkOwned"
    )
  ];
}

function applyOperations(
  candidate: JsonObject,
  operations: readonly CollaborationPatchOperation[]
): CollaborationDiagnostic | undefined {
  try {
    const results = applyPatch(candidate, operations as unknown as Operation[]);
    const failure = results.find((result) => result !== null);
    return failure === undefined ? undefined : patchFailure();
  } catch {
    return patchFailure();
  }
}

function removedPaths(operations: readonly CollaborationPatchOperation[]): readonly string[] {
  return operations
    .filter((operation) => operation.op === CollaborationPatchOperationType.Remove)
    .map((operation) => operation.path);
}

function patchFailure(): CollaborationDiagnostic {
  return diagnostic(
    CollaborationErrorCode.InvalidPatch,
    "/operations",
    "collaboration.patch.failed"
  );
}

function diagnostic(
  code: CollaborationErrorCode,
  path: string,
  messageKey: string
): CollaborationDiagnostic {
  return { code, messageKey, path };
}

function freezeJson<T extends JsonObject>(value: T): T {
  for (const child of Object.values(value)) freezeChild(child);
  return Object.freeze(value);
}

function freezeChild(value: unknown): void {
  if (Array.isArray(value)) return freezeArray(value);
  if (isObjectValue(value)) freezeJson(value as JsonObject);
}

function freezeArray(value: unknown[]): void {
  for (const child of value) freezeChild(child);
  Object.freeze(value);
}

function isObjectValue(value: unknown): value is object {
  return [value !== null, typeof value === "object"].every(Boolean);
}
