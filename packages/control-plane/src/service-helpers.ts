import type { JsonObject } from "@unislang/unifold-contracts";

import type { ControlPlaneServicePorts } from "./ports.js";
import {
  ControlPlaneAuditAction,
  ControlPlaneAuditOutcome,
  ControlPlaneCapability,
  ControlPlaneDecision,
  ControlPlaneEffectLeaseStatus,
  ControlPlaneErrorCode,
  ControlPlaneOperation,
  ControlPlaneOperationStatus,
  ControlPlaneProtocolVersion,
  type ControlPlaneAuditEntry,
  type ControlPlaneAuthenticatedRequest,
  type ControlPlaneCommitDocumentRequest,
  type ControlPlaneDocumentRevision,
  type ControlPlaneEffectExecution,
  type ControlPlaneInvokeEffectRequest,
  type ControlPlaneReadDocumentRequest,
  type ControlPlaneRequestMetadata,
  type ControlPlaneResult,
  type ControlPlaneTrustedSession
} from "./types.js";

interface AuthorizedRequest {
  readonly failure?: ControlPlaneResult<never>;
  readonly session?: ControlPlaneTrustedSession;
}

export async function authorizedTenant(
  ports: ControlPlaneServicePorts,
  request: ControlPlaneAuthenticatedRequest,
  capability: ControlPlaneCapability
): Promise<AuthorizedRequest> {
  const session = await ports.identity.resolve(request.sessionToken);
  if (session === undefined) return invalidSession();
  return authorize(ports, request, capability, `tenant:${session.tenantId}`, session);
}

export async function authorize(
  ports: ControlPlaneServicePorts,
  request: ControlPlaneAuthenticatedRequest,
  capability: ControlPlaneCapability,
  resourceId: string,
  knownSession?: ControlPlaneTrustedSession
): Promise<AuthorizedRequest> {
  const session = await resolveSession(ports, request.sessionToken, knownSession);
  if (session === undefined) return invalidSession();
  const decision = await ports.authorization.decide({ capability, resourceId, session });
  if (decision === ControlPlaneDecision.Allow) return { session };
  await ports.store.appendAudit(deniedAudit(ports, request, session, capability, resourceId));
  return {
    failure: failure(ControlPlaneOperationStatus.Denied, ControlPlaneErrorCode.AuthorizationDenied)
  };
}

async function resolveSession(
  ports: ControlPlaneServicePorts,
  sessionToken: string,
  knownSession: ControlPlaneTrustedSession | undefined
): Promise<ControlPlaneTrustedSession | undefined> {
  if (knownSession !== undefined) return knownSession;
  return ports.identity.resolve(sessionToken);
}

export function effectFingerprint(request: ControlPlaneInvokeEffectRequest): JsonObject {
  return { effectId: request.effectId, input: request.input, objectId: request.objectId };
}

export function leaseResult(lease: {
  readonly result?: ControlPlaneResult<ControlPlaneEffectExecution>;
  readonly status: ControlPlaneEffectLeaseStatus;
}): ControlPlaneResult<ControlPlaneEffectExecution> {
  if (lease.status === ControlPlaneEffectLeaseStatus.Replay) return requireResult(lease.result);
  if (lease.status === ControlPlaneEffectLeaseStatus.InProgress) {
    return failure(ControlPlaneOperationStatus.Unavailable, ControlPlaneErrorCode.EffectInProgress);
  }
  return failure(ControlPlaneOperationStatus.Conflict, ControlPlaneErrorCode.IdempotencyConflict);
}

export async function missingEffect(
  ports: ControlPlaneServicePorts,
  request: ControlPlaneInvokeEffectRequest,
  session: ControlPlaneTrustedSession
): Promise<ControlPlaneResult<ControlPlaneEffectExecution>> {
  await ports.store.appendAudit(effectAudit(ports, request, session));
  return failure(ControlPlaneOperationStatus.NotFound, ControlPlaneErrorCode.EffectNotRegistered);
}

export async function auditRead(
  ports: ControlPlaneServicePorts,
  request: ControlPlaneReadDocumentRequest,
  session: ControlPlaneTrustedSession,
  found: boolean
): Promise<void> {
  await ports.store.appendAudit({
    ...auditBase(ports, request, session),
    action: ControlPlaneAuditAction.DocumentRead,
    details: { found, objectId: request.objectId },
    outcome: found ? ControlPlaneAuditOutcome.Succeeded : ControlPlaneAuditOutcome.Failed
  });
}

function deniedAudit(
  ports: ControlPlaneServicePorts,
  request: ControlPlaneAuthenticatedRequest,
  session: ControlPlaneTrustedSession,
  capability: ControlPlaneCapability,
  resourceId: string
): ControlPlaneAuditEntry {
  return {
    ...auditBase(ports, request, session),
    action: ControlPlaneAuditAction.RequestDenied,
    details: { capability, resourceId },
    outcome: ControlPlaneAuditOutcome.Denied
  };
}

function effectAudit(
  ports: ControlPlaneServicePorts,
  request: ControlPlaneInvokeEffectRequest,
  session: ControlPlaneTrustedSession
): ControlPlaneAuditEntry {
  return {
    ...auditBase(ports, request, session),
    action: ControlPlaneAuditAction.EffectInvoked,
    details: { effectId: request.effectId, objectId: request.objectId },
    outcome: ControlPlaneAuditOutcome.Failed
  };
}

function auditBase(
  ports: ControlPlaneServicePorts,
  request: ControlPlaneRequestMetadata,
  session: ControlPlaneTrustedSession
) {
  return {
    actorId: session.actorId,
    correlationId: request.correlationId,
    occurredAt: ports.clock.now(),
    requestId: request.requestId,
    tenantId: session.tenantId,
    ...(request.traceparent === undefined ? {} : { traceparent: request.traceparent })
  };
}

function validEffectRequest(request: ControlPlaneInvokeEffectRequest): boolean {
  if (!validText(request.effectId)) return false;
  if (!validText(request.idempotencyKey)) return false;
  return validText(request.objectId);
}

export function validObjectRequest(
  request: ControlPlaneReadDocumentRequest | ControlPlaneCommitDocumentRequest,
  operation: ControlPlaneOperation
): boolean {
  if (!validRequest(request, operation)) return false;
  return validText(request.objectId);
}

export function validEffectOperation(request: ControlPlaneInvokeEffectRequest): boolean {
  if (!validRequest(request, ControlPlaneOperation.EffectInvoke)) return false;
  return validEffectRequest(request);
}

export function validRealtimeRequest(
  request: ControlPlaneAuthenticatedRequest & { readonly afterSequence: number }
): boolean {
  if (!validRequest(request, ControlPlaneOperation.RealtimeResume)) return false;
  return validSequence(request.afterSequence);
}

export function validRestoreRequest(
  request: ControlPlaneAuthenticatedRequest & { readonly backupId: string }
): boolean {
  if (!validRequest(request, ControlPlaneOperation.BackupRestore)) return false;
  return validText(request.backupId);
}

export function validRequest(
  request: ControlPlaneAuthenticatedRequest,
  operation: ControlPlaneOperation
): boolean {
  if (request.protocolVersion !== ControlPlaneProtocolVersion.Version1) return false;
  if (request.operation !== operation) return false;
  return validMetadata(request);
}

function validMetadata(request: ControlPlaneRequestMetadata): boolean {
  if (!validText(request.requestId)) return false;
  return validText(request.correlationId);
}

export function validSequence(value: number): boolean {
  if (!Number.isSafeInteger(value)) return false;
  return value >= 0;
}

export function validText(value: string): boolean {
  return value.trim().length > 0;
}

function succeeded<TValue>(value: TValue): ControlPlaneResult<TValue> {
  return { status: ControlPlaneOperationStatus.Succeeded, value };
}

export function invalid<TValue>(): ControlPlaneResult<TValue> {
  return failure(ControlPlaneOperationStatus.Invalid, ControlPlaneErrorCode.InvalidRequest);
}

function notFound<TValue>(): ControlPlaneResult<TValue> {
  return failure(ControlPlaneOperationStatus.NotFound, ControlPlaneErrorCode.DocumentNotFound);
}

export function readResult(
  value: ControlPlaneDocumentRevision | undefined
): ControlPlaneResult<ControlPlaneDocumentRevision> {
  if (value === undefined) return notFound();
  return succeeded(value);
}

function failure<TValue>(
  status: ControlPlaneOperationStatus,
  code: ControlPlaneErrorCode
): ControlPlaneResult<TValue> {
  return { error: { code, messageKey: `control-plane.${code}` }, status };
}

function invalidSession(): AuthorizedRequest {
  return {
    failure: failure(ControlPlaneOperationStatus.Denied, ControlPlaneErrorCode.SessionInvalid)
  };
}

export function requireFailure(result: AuthorizedRequest): ControlPlaneResult<never> {
  if (result.failure === undefined) throw new Error("Expected an authorization failure.");
  return result.failure;
}

function requireResult(
  result: ControlPlaneResult<ControlPlaneEffectExecution> | undefined
): ControlPlaneResult<ControlPlaneEffectExecution> {
  if (result === undefined) throw new Error("Expected a completed idempotent result.");
  return replayed(result);
}

function replayed(
  result: ControlPlaneResult<ControlPlaneEffectExecution>
): ControlPlaneResult<ControlPlaneEffectExecution> {
  if (result.value === undefined) return result;
  return { ...result, value: { ...result.value, replayed: true } };
}
