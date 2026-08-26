import type { JsonValue } from "@unislang/unifold-contracts";

import type {
  ControlPlaneCommitCommand,
  ControlPlaneCompleteEffectCommand,
  ControlPlaneEffectLeaseCommand,
  ControlPlaneFailEffectCommand,
  ControlPlaneServicePorts
} from "./ports.js";
import type {
  ControlPlaneAuthenticatedRequest,
  ControlPlaneCommitDocumentRequest,
  ControlPlaneInvokeEffectRequest,
  ControlPlaneTrustedSession
} from "./types.js";

export function recoveryCommand(
  ports: Pick<ControlPlaneServicePorts, "clock">,
  request: ControlPlaneAuthenticatedRequest,
  session: ControlPlaneTrustedSession
) {
  return {
    actorId: session.actorId,
    correlationId: request.correlationId,
    occurredAt: ports.clock.now(),
    protocolVersion: request.protocolVersion,
    requestId: request.requestId,
    tenantId: session.tenantId,
    ...traceparent(request.traceparent)
  };
}

export function commitCommand(
  ports: Pick<ControlPlaneServicePorts, "clock">,
  request: ControlPlaneCommitDocumentRequest,
  session: ControlPlaneTrustedSession
): ControlPlaneCommitCommand {
  return {
    actorId: session.actorId,
    correlationId: request.correlationId,
    document: request.document,
    ...expectedRevision(request.expectedRevision),
    objectId: request.objectId,
    occurredAt: ports.clock.now(),
    requestId: request.requestId,
    tenantId: session.tenantId,
    ...traceparent(request.traceparent)
  };
}

export function effectLeaseCommand(
  request: ControlPlaneInvokeEffectRequest,
  session: ControlPlaneTrustedSession,
  fingerprint: string
): ControlPlaneEffectLeaseCommand {
  return {
    effectId: request.effectId,
    fingerprint,
    idempotencyKey: request.idempotencyKey,
    objectId: request.objectId,
    tenantId: session.tenantId
  };
}

export function completeEffectCommand(
  ports: Pick<ControlPlaneServicePorts, "clock">,
  request: ControlPlaneInvokeEffectRequest,
  session: ControlPlaneTrustedSession,
  lease: ControlPlaneEffectLeaseCommand,
  output: JsonValue
): ControlPlaneCompleteEffectCommand {
  return { ...effectCompletionBase(ports, request, session, lease), output };
}

export function failEffectCommand(
  ports: Pick<ControlPlaneServicePorts, "clock">,
  request: ControlPlaneInvokeEffectRequest,
  session: ControlPlaneTrustedSession,
  lease: ControlPlaneEffectLeaseCommand
): ControlPlaneFailEffectCommand {
  return effectCompletionBase(ports, request, session, lease);
}

function effectCompletionBase(
  ports: Pick<ControlPlaneServicePorts, "clock">,
  request: ControlPlaneInvokeEffectRequest,
  session: ControlPlaneTrustedSession,
  lease: ControlPlaneEffectLeaseCommand
) {
  return {
    ...lease,
    actorId: session.actorId,
    completedAt: ports.clock.now(),
    correlationId: request.correlationId,
    protocolVersion: request.protocolVersion,
    requestId: request.requestId,
    ...traceparent(request.traceparent)
  };
}

function expectedRevision(value: string | undefined): { readonly expectedRevision?: string } {
  if (value === undefined) return {};
  return { expectedRevision: value };
}

function traceparent(value: string | undefined): { readonly traceparent?: string } {
  if (value === undefined) return {};
  return { traceparent: value };
}
