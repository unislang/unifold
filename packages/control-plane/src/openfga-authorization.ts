import type { ControlPlaneAuthorizationPort } from "./ports.js";
import {
  ControlPlaneCapability,
  ControlPlaneDecision,
  type ControlPlaneAuthorizationRequest
} from "./types.js";

export interface OpenFgaCheckRequest {
  readonly object: string;
  readonly relation: string;
  readonly user: string;
}

export interface OpenFgaCheckOptions {
  readonly authorizationModelId: string;
}

/** Narrow structural subset implemented by the official `@openfga/sdk` client. */
export interface OpenFgaCheckClient {
  check(
    request: OpenFgaCheckRequest,
    options: OpenFgaCheckOptions
  ): Promise<{ readonly allowed?: boolean }>;
}

export interface OpenFgaAuthorizationOptions {
  readonly authorizationModelId: string;
  readonly client: OpenFgaCheckClient;
}

const relations: Readonly<Record<ControlPlaneCapability, string>> = Object.freeze({
  [ControlPlaneCapability.BackupCreate]: "backup_create",
  [ControlPlaneCapability.BackupRestore]: "backup_restore",
  [ControlPlaneCapability.CollaborationApprove]: "collaboration_approve",
  [ControlPlaneCapability.CollaborationComment]: "collaboration_comment",
  [ControlPlaneCapability.CollaborationPresence]: "collaboration_presence",
  [ControlPlaneCapability.CollaborationPropose]: "collaboration_propose",
  [ControlPlaneCapability.CollaborationPublish]: "collaboration_publish",
  [ControlPlaneCapability.CollaborationUndo]: "collaboration_undo",
  [ControlPlaneCapability.DocumentCommit]: "document_commit",
  [ControlPlaneCapability.DocumentRead]: "document_read",
  [ControlPlaneCapability.EffectInvoke]: "effect_invoke",
  [ControlPlaneCapability.RealtimeResume]: "realtime_resume"
});

export function createOpenFgaAuthorizationPort(
  options: OpenFgaAuthorizationOptions
): ControlPlaneAuthorizationPort {
  const modelId = requiredIdentifier(options.authorizationModelId, "authorization model ID");
  return Object.freeze({
    async decide(request: ControlPlaneAuthorizationRequest): Promise<ControlPlaneDecision> {
      const tuple = authorizedTuple(request);
      return tuple === undefined
        ? ControlPlaneDecision.Deny
        : providerDecision(options.client, modelId, tuple);
    }
  });
}

function authorizedTuple(
  request: ControlPlaneAuthorizationRequest
): OpenFgaCheckRequest | undefined {
  if (!request.session.capabilities.includes(request.capability)) return undefined;
  return openFgaTupleForAuthorizationRequest(request);
}

async function providerDecision(
  client: OpenFgaCheckClient,
  modelId: string,
  tuple: OpenFgaCheckRequest
): Promise<ControlPlaneDecision> {
  try {
    const result = await client.check(tuple, { authorizationModelId: modelId });
    return decision(result.allowed);
  } catch {
    return ControlPlaneDecision.Deny;
  }
}

function decision(allowed: boolean | undefined): ControlPlaneDecision {
  return allowed === true ? ControlPlaneDecision.Allow : ControlPlaneDecision.Deny;
}

export function openFgaTupleForAuthorizationRequest(
  request: ControlPlaneAuthorizationRequest
): OpenFgaCheckRequest | undefined {
  const values = [request.session.tenantId, request.session.actorId, request.resourceId];
  if (!values.every(validTupleIdentity)) return undefined;
  const tenant = tupleSegment(request.session.tenantId);
  return Object.freeze({
    object: `unifold_resource:${tenant}~${tupleSegment(request.resourceId)}`,
    relation: relations[request.capability],
    user: `unifold_principal:${tenant}~${tupleSegment(request.session.actorId)}`
  });
}

function tupleSegment(value: string): string {
  return encodeURIComponent(value).replaceAll("~", "%7E");
}

function validTupleIdentity(value: string): boolean {
  return [value.length > 0, value.length <= 1024, [...value].every(visibleCharacter)].every(
    Boolean
  );
}

function visibleCharacter(character: string): boolean {
  const code = character.codePointAt(0) ?? 0;
  return code > 31 && code !== 127;
}

function requiredIdentifier(value: string, label: string): string {
  if (!validTupleIdentity(value)) throw new TypeError(`OpenFGA ${label} is invalid.`);
  return value;
}
