import type { JsonValue } from "@unislang/unifold-contracts";

import type { ControlPlaneServicePorts } from "./ports.js";
import {
  ControlPlaneCapability,
  ControlPlaneEffectLeaseStatus,
  ControlPlaneOperation,
  type ControlPlaneBackupReceipt,
  type ControlPlaneBackupRequest,
  type ControlPlaneCommitDocumentRequest,
  type ControlPlaneDocumentRevision,
  type ControlPlaneEffectExecution,
  type ControlPlaneInvokeEffectRequest,
  type ControlPlaneReadDocumentRequest,
  type ControlPlaneRealtimeBatch,
  type ControlPlaneRestoreReceipt,
  type ControlPlaneRestoreRequest,
  type ControlPlaneResult,
  type ControlPlaneResumeRealtimeRequest,
  type ControlPlaneTrustedSession
} from "./types.js";
import {
  auditRead,
  authorize,
  authorizedTenant,
  effectFingerprint,
  invalid,
  leaseResult,
  missingEffect,
  readResult,
  requireFailure,
  validEffectOperation,
  validObjectRequest,
  validRealtimeRequest,
  validRequest,
  validRestoreRequest
} from "./service-helpers.js";
import {
  commitCommand,
  completeEffectCommand,
  effectLeaseCommand,
  failEffectCommand,
  recoveryCommand
} from "./service-commands.js";

export interface ControlPlaneService {
  createBackup(
    request: ControlPlaneBackupRequest
  ): Promise<ControlPlaneResult<ControlPlaneBackupReceipt>>;
  commitDocument(
    request: ControlPlaneCommitDocumentRequest
  ): Promise<ControlPlaneResult<ControlPlaneDocumentRevision>>;
  invokeEffect(
    request: ControlPlaneInvokeEffectRequest,
    signal?: AbortSignal
  ): Promise<ControlPlaneResult<ControlPlaneEffectExecution>>;
  readDocument(
    request: ControlPlaneReadDocumentRequest
  ): Promise<ControlPlaneResult<ControlPlaneDocumentRevision>>;
  restoreBackup(
    request: ControlPlaneRestoreRequest
  ): Promise<ControlPlaneResult<ControlPlaneRestoreReceipt>>;
  resumeRealtime(
    request: ControlPlaneResumeRealtimeRequest
  ): Promise<ControlPlaneResult<ControlPlaneRealtimeBatch>>;
}

export function createControlPlaneService(ports: ControlPlaneServicePorts): ControlPlaneService {
  const service: ControlPlaneService = {
    commitDocument: (request) => commitDocument(ports, request),
    createBackup: (request) => createBackup(ports, request),
    invokeEffect: (request, signal) => invokeEffect(ports, request, signal),
    readDocument: (request) => readDocument(ports, request),
    restoreBackup: (request) => restoreBackup(ports, request),
    resumeRealtime: (request) => resumeRealtime(ports, request)
  };
  return Object.freeze(service);
}

async function commitDocument(
  ports: ControlPlaneServicePorts,
  request: ControlPlaneCommitDocumentRequest
): Promise<ControlPlaneResult<ControlPlaneDocumentRevision>> {
  if (!validObjectRequest(request, ControlPlaneOperation.DocumentCommit)) return invalid();
  const authorized = await authorize(
    ports,
    request,
    ControlPlaneCapability.DocumentCommit,
    request.objectId
  );
  if (authorized.session === undefined) return requireFailure(authorized);
  return ports.store.commitDocument(commitCommand(ports, request, authorized.session));
}

async function readDocument(
  ports: ControlPlaneServicePorts,
  request: ControlPlaneReadDocumentRequest
): Promise<ControlPlaneResult<ControlPlaneDocumentRevision>> {
  if (!validObjectRequest(request, ControlPlaneOperation.DocumentRead)) return invalid();
  const authorized = await authorize(
    ports,
    request,
    ControlPlaneCapability.DocumentRead,
    request.objectId
  );
  if (authorized.session === undefined) return requireFailure(authorized);
  const value = await ports.store.readDocument(authorized.session.tenantId, request.objectId);
  await auditRead(ports, request, authorized.session, value !== undefined);
  return readResult(value);
}

async function invokeEffect(
  ports: ControlPlaneServicePorts,
  request: ControlPlaneInvokeEffectRequest,
  signal?: AbortSignal
): Promise<ControlPlaneResult<ControlPlaneEffectExecution>> {
  if (!validEffectOperation(request)) return invalid();
  const authorized = await authorize(
    ports,
    request,
    ControlPlaneCapability.EffectInvoke,
    request.objectId
  );
  if (authorized.session === undefined) return requireFailure(authorized);
  return invokeAuthorizedEffect(ports, request, authorized.session, signal);
}

async function invokeAuthorizedEffect(
  ports: ControlPlaneServicePorts,
  request: ControlPlaneInvokeEffectRequest,
  session: ControlPlaneTrustedSession,
  signal?: AbortSignal
): Promise<ControlPlaneResult<ControlPlaneEffectExecution>> {
  const handler = ports.effects.resolve(request.effectId);
  if (handler === undefined) return missingEffect(ports, request, session);
  return invokeRegisteredEffect(ports, request, session, handler.invoke, signal);
}

async function invokeRegisteredEffect(
  ports: ControlPlaneServicePorts,
  request: ControlPlaneInvokeEffectRequest,
  session: ControlPlaneTrustedSession,
  invoke: (input: JsonValue, signal?: AbortSignal) => Promise<JsonValue>,
  signal?: AbortSignal
): Promise<ControlPlaneResult<ControlPlaneEffectExecution>> {
  const fingerprint = await ports.fingerprint.fingerprint(effectFingerprint(request));
  const command = effectLeaseCommand(request, session, fingerprint);
  const lease = await ports.store.beginEffect(command);
  if (lease.status !== ControlPlaneEffectLeaseStatus.Acquired) return leaseResult(lease);
  try {
    const output = await invoke(request.input, signal);
    return ports.store.completeEffect(
      completeEffectCommand(ports, request, session, command, output)
    );
  } catch {
    return ports.store.failEffect(failEffectCommand(ports, request, session, command));
  }
}

async function resumeRealtime(
  ports: ControlPlaneServicePorts,
  request: ControlPlaneResumeRealtimeRequest
): Promise<ControlPlaneResult<ControlPlaneRealtimeBatch>> {
  if (!validRealtimeRequest(request)) return invalid();
  const session = await authorizedTenant(ports, request, ControlPlaneCapability.RealtimeResume);
  if (session.session === undefined) return requireFailure(session);
  return ports.store.resumeRealtime(session.session.tenantId, request.afterSequence);
}

async function createBackup(
  ports: ControlPlaneServicePorts,
  request: ControlPlaneBackupRequest
): Promise<ControlPlaneResult<ControlPlaneBackupReceipt>> {
  if (!validRequest(request, ControlPlaneOperation.BackupCreate)) return invalid();
  const authorized = await authorizedTenant(ports, request, ControlPlaneCapability.BackupCreate);
  if (authorized.session === undefined) return requireFailure(authorized);
  return ports.store.createBackup(recoveryCommand(ports, request, authorized.session));
}

async function restoreBackup(
  ports: ControlPlaneServicePorts,
  request: ControlPlaneRestoreRequest
): Promise<ControlPlaneResult<ControlPlaneRestoreReceipt>> {
  if (!validRestoreRequest(request)) return invalid();
  const authorized = await authorizedTenant(ports, request, ControlPlaneCapability.BackupRestore);
  if (authorized.session === undefined) return requireFailure(authorized);
  return ports.store.restoreBackup({
    ...recoveryCommand(ports, request, authorized.session),
    backupId: request.backupId
  });
}
