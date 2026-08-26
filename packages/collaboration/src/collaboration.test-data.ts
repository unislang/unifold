import {
  CollaborationActorType,
  CollaborationCapability,
  CollaborationOperation,
  CollaborationPatchOperationType,
  CollaborationProtocolVersion,
  type CollaborationActorContext,
  type CollaborationSubmitProposalRequest
} from "./types.js";

export function proposalRequest(
  overrides: Partial<CollaborationSubmitProposalRequest> = {}
): CollaborationSubmitProposalRequest {
  return {
    affectedIds: ["title"],
    baseRevision: "revision-000000000001",
    branchId: "main",
    correlationId: "correlation-1",
    idempotencyKey: "idempotency-1",
    intent: "Update the title",
    operation: CollaborationOperation.Propose,
    operations: [
      {
        op: CollaborationPatchOperationType.Replace,
        path: "/view/title",
        value: "Updated"
      }
    ],
    proposalId: "proposal-1",
    protocolVersion: CollaborationProtocolVersion.Version1,
    requestId: "request-1",
    ...overrides
  };
}

export function actor(
  actorId = "author-1",
  capabilities: readonly CollaborationCapability[] = Object.values(CollaborationCapability)
): CollaborationActorContext {
  return {
    actorId,
    actorType: CollaborationActorType.Human,
    capabilities,
    tenantId: "tenant-1"
  };
}

export function initialDocument() {
  return {
    id: "document-1",
    revision: "authored-revision",
    schemaVersion: "1.0.0",
    view: { help: "Original help", id: "root", title: "Original title", type: "Box" }
  };
}
