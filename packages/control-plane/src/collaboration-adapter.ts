import {
  CollaborationActorType,
  CollaborationCapability,
  type CollaborationActorContext
} from "@unislang/unifold-collaboration";

import type { ControlPlaneAuthorizationPort } from "./ports.js";
import {
  ControlPlaneCapability,
  ControlPlaneDecision,
  type ControlPlaneTrustedSession
} from "./types.js";

export interface CollaborationAuthorizationOptions {
  readonly actorType?: CollaborationActorType;
  readonly authorization: ControlPlaneAuthorizationPort;
  readonly resourceId: string;
  readonly session: ControlPlaneTrustedSession;
}

const collaborationCapabilities = Object.freeze([
  [ControlPlaneCapability.CollaborationApprove, CollaborationCapability.Approve],
  [ControlPlaneCapability.CollaborationComment, CollaborationCapability.Comment],
  [ControlPlaneCapability.CollaborationPresence, CollaborationCapability.Presence],
  [ControlPlaneCapability.CollaborationPropose, CollaborationCapability.Propose],
  [ControlPlaneCapability.CollaborationPublish, CollaborationCapability.Publish],
  [ControlPlaneCapability.CollaborationUndo, CollaborationCapability.Undo]
] as const);

export async function authorizeCollaborationActor({
  actorType = CollaborationActorType.Human,
  authorization,
  resourceId,
  session
}: CollaborationAuthorizationOptions): Promise<CollaborationActorContext> {
  const capabilities = await resolvedCapabilities(authorization, resourceId, session);
  return Object.freeze({
    actorId: session.actorId,
    actorType,
    capabilities: Object.freeze(capabilities),
    tenantId: session.tenantId
  });
}

async function resolvedCapabilities(
  authorization: ControlPlaneAuthorizationPort,
  resourceId: string,
  session: ControlPlaneTrustedSession
): Promise<CollaborationCapability[]> {
  const candidates = collaborationCapabilities.filter(([capability]) =>
    session.capabilities.includes(capability)
  );
  const decisions = await Promise.all(
    candidates.map(async ([controlPlane, collaboration]) => ({
      collaboration,
      decision: await authorization.decide({ capability: controlPlane, resourceId, session })
    }))
  );
  return decisions
    .filter(({ decision }) => decision === ControlPlaneDecision.Allow)
    .map(({ collaboration }) => collaboration);
}
