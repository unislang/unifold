import {
  ControlPlaneCapability,
  ControlPlaneOperation,
  ControlPlaneProtocolVersion,
  type ControlPlaneGrant,
  type ControlPlaneTrustedSession
} from "./types.js";
import type { ReferenceControlPlaneOptions } from "./ports.js";

export const session: ControlPlaneTrustedSession = Object.freeze({
  actorId: "actor-1",
  capabilities: Object.freeze(Object.values(ControlPlaneCapability)),
  sessionId: "session-1",
  tenantId: "tenant-a"
});

export const otherSession: ControlPlaneTrustedSession = Object.freeze({
  actorId: "actor-2",
  capabilities: Object.freeze(Object.values(ControlPlaneCapability)),
  sessionId: "session-2",
  tenantId: "tenant-b"
});

export function grant(
  capability: ControlPlaneCapability,
  resourceId: string,
  trustedSession: ControlPlaneTrustedSession = session
): ControlPlaneGrant {
  return {
    actorId: trustedSession.actorId,
    capability,
    resourceId,
    tenantId: trustedSession.tenantId
  };
}

export function referenceOptions(
  extra: Partial<ReferenceControlPlaneOptions> = {}
): ReferenceControlPlaneOptions {
  return {
    clock: { now: () => "2026-08-25T12:00:00.000Z" },
    sessions: { "token-a": session, "token-b": otherSession },
    ...extra
  };
}

export function metadata<Operation extends ControlPlaneOperation>(
  operation: Operation,
  requestId = "request-1"
) {
  return {
    correlationId: "correlation-1",
    operation,
    protocolVersion: ControlPlaneProtocolVersion.Version1,
    requestId,
    sessionToken: "token-a",
    traceparent: "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01"
  };
}

export function document(revision = "client-revision") {
  return {
    id: "document-1",
    revision,
    schemaVersion: "1.0.0"
  };
}
