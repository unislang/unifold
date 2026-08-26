import type { JsonObject, JsonValue } from "@unislang/unifold-contracts";

import type {
  ControlPlaneCommitCommand,
  ControlPlaneCompleteEffectCommand,
  ControlPlaneFailEffectCommand,
  ControlPlaneFingerprintPort,
  ControlPlaneRecoveryCommand
} from "./ports.js";
import { controlPlaneFingerprint } from "./fingerprint.js";
import {
  ControlPlaneAuditAction,
  ControlPlaneAuditOutcome,
  ControlPlaneOperationStatus,
  type ControlPlaneAuditEntry,
  type ControlPlaneDocumentRevision,
  type ControlPlaneEffectExecution,
  type ControlPlaneErrorCode,
  type ControlPlaneRealtimeMessage,
  type ControlPlaneResult
} from "./types.js";

interface BackupEffectState {
  readonly fingerprint: string;
  readonly pending: boolean;
  readonly result?: ControlPlaneResult<ControlPlaneEffectExecution>;
}

export function revisionRecord(
  command: ControlPlaneCommitCommand,
  revision: string,
  parentRevision: string | undefined
): ControlPlaneDocumentRevision {
  const document = structuredClone(command.document) as Record<string, JsonValue | undefined>;
  document["revision"] = revision;
  return {
    actorId: command.actorId,
    committedAt: command.occurredAt,
    document,
    objectId: command.objectId,
    ...(parentRevision === undefined ? {} : { parentRevision }),
    revision,
    tenantId: command.tenantId
  };
}

export function backupPayload(
  tenantId: string,
  source: ReadonlyMap<string, ControlPlaneDocumentRevision>,
  effects: ReadonlyMap<string, BackupEffectState>
): JsonObject {
  const documents = [...source.entries()].sort(compareEntries).map(backupDocument);
  const idempotency = [...effects.entries()].sort(compareEffectEntries).map(backupEffect);
  return { documents, idempotency, tenantId };
}

function compareEntries(
  first: readonly [string, ControlPlaneDocumentRevision],
  second: readonly [string, ControlPlaneDocumentRevision]
): number {
  return first[0].localeCompare(second[0]);
}

function backupDocument(entry: readonly [string, ControlPlaneDocumentRevision]): JsonObject {
  return { objectId: entry[0], revision: entry[1] };
}

function compareEffectEntries(
  first: readonly [string, BackupEffectState],
  second: readonly [string, BackupEffectState]
): number {
  return first[0].localeCompare(second[0]);
}

function backupEffect(entry: readonly [string, BackupEffectState]): JsonObject {
  const [idempotencyKey, effect] = entry;
  const result =
    effect.result === undefined ? null : (structuredClone(effect.result) as unknown as JsonValue);
  return { fingerprint: effect.fingerprint, idempotencyKey, pending: effect.pending, result };
}

export function matchesExpectedRevision(
  current: ControlPlaneDocumentRevision | undefined,
  expected: string | undefined
): boolean {
  if (current === undefined) return expected === undefined;
  return current.revision === expected;
}

export function currentRevision(
  current: ControlPlaneDocumentRevision | undefined
): string | undefined {
  if (current === undefined) return undefined;
  return current.revision;
}

export function quotaExceeded(
  current: ControlPlaneDocumentRevision | undefined,
  documentCount: number,
  maximum: number
): boolean {
  if (current !== undefined) return false;
  return documentCount >= maximum;
}

export function configuredLimit(value: number | undefined, fallback: number): number {
  return value ?? fallback;
}

export function configuredFingerprint(
  value: ControlPlaneFingerprintPort | undefined
): ControlPlaneFingerprintPort {
  return value ?? controlPlaneFingerprint;
}

export function firstRealtimeSequence(
  messages: readonly ControlPlaneRealtimeMessage[]
): number | undefined {
  return messages[0]?.sequence;
}

export function oldestAvailableSequence(
  firstSequence: number | undefined,
  nextSequence: number
): number {
  return firstSequence ?? nextSequence;
}

export function commitAudit(
  command: ControlPlaneCommitCommand,
  outcome: ControlPlaneAuditOutcome,
  revision?: string
): ControlPlaneAuditEntry {
  return {
    ...auditBase(command),
    action: ControlPlaneAuditAction.DocumentCommitted,
    details: {
      objectId: command.objectId,
      ...(revision === undefined ? {} : { revision })
    },
    outcome
  };
}

export function effectAudit(
  command: ControlPlaneCompleteEffectCommand | ControlPlaneFailEffectCommand,
  outcome: ControlPlaneAuditOutcome
): ControlPlaneAuditEntry {
  return {
    ...auditBase(command),
    action: ControlPlaneAuditAction.EffectInvoked,
    details: { effectId: command.effectId, objectId: command.objectId },
    outcome
  };
}

export function recoveryAudit(
  command: ControlPlaneRecoveryCommand,
  action: ControlPlaneAuditAction,
  backupId: string
): ControlPlaneAuditEntry {
  return {
    ...auditBase(command),
    action,
    details: { backupId },
    outcome: ControlPlaneAuditOutcome.Succeeded
  };
}

function auditBase(command: {
  readonly actorId: string;
  readonly completedAt?: string;
  readonly correlationId: string;
  readonly occurredAt?: string;
  readonly requestId: string;
  readonly tenantId: string;
  readonly traceparent?: string;
}) {
  return {
    actorId: command.actorId,
    correlationId: command.correlationId,
    occurredAt: auditTime(command),
    requestId: command.requestId,
    tenantId: command.tenantId,
    ...traceparent(command.traceparent)
  };
}

function auditTime(command: {
  readonly completedAt?: string;
  readonly occurredAt?: string;
}): string {
  if (command.occurredAt !== undefined) return command.occurredAt;
  if (command.completedAt !== undefined) return command.completedAt;
  throw new Error("Audit record has no timestamp.");
}

function traceparent(value: string | undefined): { readonly traceparent?: string } {
  if (value === undefined) return {};
  return { traceparent: value };
}

export function succeeded<TValue>(value: TValue): ControlPlaneResult<TValue> {
  return { status: ControlPlaneOperationStatus.Succeeded, value };
}

export function failure<TValue>(
  status: ControlPlaneOperationStatus,
  code: ControlPlaneErrorCode
): ControlPlaneResult<TValue> {
  return { error: { code, messageKey: `control-plane.${code}` }, status };
}
