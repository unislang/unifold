import {
  ControlPlaneDecision,
  type ControlPlaneAuthorizationRequest,
  type ControlPlaneGrant,
  type ControlPlaneTrustedSession
} from "./types.js";
import type { ControlPlaneAuthorizationPort, ControlPlaneIdentityPort } from "./ports.js";

export function createReferenceIdentityPort(
  sessions: Readonly<Record<string, ControlPlaneTrustedSession>> = {}
): ControlPlaneIdentityPort {
  const records = new Map(Object.entries(sessions));
  return Object.freeze({
    async resolve(sessionToken: string) {
      return records.get(sessionToken);
    }
  });
}

export function createReferenceAuthorizationPort(
  grants: readonly ControlPlaneGrant[] = []
): ControlPlaneAuthorizationPort {
  return Object.freeze({
    async decide(request: ControlPlaneAuthorizationRequest) {
      if (!request.session.capabilities.includes(request.capability)) {
        return ControlPlaneDecision.Deny;
      }
      return grants.some((grant) => matchesGrant(grant, request))
        ? ControlPlaneDecision.Allow
        : ControlPlaneDecision.Deny;
    }
  });
}

function matchesGrant(
  grant: ControlPlaneGrant,
  request: Parameters<ControlPlaneAuthorizationPort["decide"]>[0]
): boolean {
  if (grant.tenantId !== request.session.tenantId) return false;
  return matchesActorGrant(grant, request);
}

function matchesActorGrant(
  grant: ControlPlaneGrant,
  request: ControlPlaneAuthorizationRequest
): boolean {
  if (grant.actorId !== request.session.actorId) return false;
  return grant.capability === request.capability && grant.resourceId === request.resourceId;
}
