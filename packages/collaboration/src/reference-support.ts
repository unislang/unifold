import type { JsonObject, JsonValue } from "@unislang/unifold-contracts";
import canonicalize from "canonicalize";

import {
  CollaborationErrorCode,
  CollaborationStatus,
  type CollaborationBranchPolicy,
  type CollaborationDiagnostic,
  type CollaborationResult
} from "./types.js";

export const defaultBranchPolicy: CollaborationBranchPolicy = Object.freeze({
  approvalTtlMs: 86_400_000,
  protected: false,
  requiredApprovals: 0,
  reviewerIds: [],
  separateAuthorAndReviewer: true
});

export function normalizeBranchPolicy(
  value: CollaborationBranchPolicy | undefined
): CollaborationBranchPolicy {
  const policy = value ?? defaultBranchPolicy;
  if (!validPolicy(policy)) throw new RangeError("The collaboration branch policy is invalid.");
  return Object.freeze({ ...policy, reviewerIds: Object.freeze([...policy.reviewerIds]) });
}

export function invalid(
  code: CollaborationErrorCode,
  messageKey: string,
  path?: string
): CollaborationResult {
  return failure(CollaborationStatus.Invalid, code, messageKey, path);
}

export function denied(code = CollaborationErrorCode.CapabilityDenied): CollaborationResult {
  return failure(CollaborationStatus.Denied, code, "collaboration.request.denied");
}

export function conflict(
  code: CollaborationErrorCode,
  messageKey: string,
  path?: string
): CollaborationResult {
  return failure(CollaborationStatus.Conflict, code, messageKey, path);
}

export function notFound(code: CollaborationErrorCode): CollaborationResult {
  return failure(CollaborationStatus.NotFound, code, "collaboration.resource.notFound");
}

export function accepted<T extends JsonValue>(value: T): CollaborationResult<T> {
  return { status: CollaborationStatus.Accepted, value };
}

export function reviewRequired<T extends JsonValue>(value: T): CollaborationResult<T> {
  return { status: CollaborationStatus.ReviewRequired, value };
}

export function replayed(result: CollaborationResult): CollaborationResult {
  return { ...structuredClone(result), status: CollaborationStatus.Replayed };
}

export function requestFingerprint(value: JsonValue): string | undefined {
  return canonicalize(value);
}

export function freezeDocument(value: JsonObject): JsonObject {
  const clone = structuredClone(value);
  freezeValue(clone);
  return clone;
}

export function diagnostic(
  code: CollaborationErrorCode,
  messageKey: string,
  path?: string
): CollaborationDiagnostic {
  return { code, messageKey, ...(path === undefined ? {} : { path }) };
}

function failure(
  status: CollaborationStatus,
  code: CollaborationErrorCode,
  messageKey: string,
  path?: string
): CollaborationResult {
  return { diagnostics: [diagnostic(code, messageKey, path)], status };
}

function validPolicy(value: CollaborationBranchPolicy): boolean {
  return [
    Number.isInteger(value.approvalTtlMs),
    value.approvalTtlMs >= 60_000,
    value.approvalTtlMs <= 2_592_000_000,
    Number.isInteger(value.requiredApprovals),
    value.requiredApprovals >= 0,
    value.requiredApprovals <= 16,
    !value.protected || value.requiredApprovals > 0,
    value.reviewerIds.length <= 64,
    new Set(value.reviewerIds).size === value.reviewerIds.length
  ].every(Boolean);
}

function freezeValue(value: unknown): void {
  if (Array.isArray(value)) return freezeArray(value);
  if (isObjectValue(value)) freezeObject(value);
}

function freezeArray(value: unknown[]): void {
  for (const child of value) freezeValue(child);
  Object.freeze(value);
}

function freezeObject(value: object): void {
  for (const child of Object.values(value)) freezeValue(child);
  Object.freeze(value);
}

function isObjectValue(value: unknown): value is object {
  return [value !== null, typeof value === "object"].every(Boolean);
}
