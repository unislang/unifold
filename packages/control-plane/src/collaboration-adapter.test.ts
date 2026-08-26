import {
  CollaborationCapability,
  CollaborationStatus,
  ReferenceCollaborationService
} from "@unislang/unifold-collaboration";
import { expect, it, vi } from "vitest";

import { authorizeCollaborationActor } from "./collaboration-adapter.js";
import { document } from "./control-plane.test-data.js";
import type { ControlPlaneAuthorizationPort } from "./ports.js";
import {
  ControlPlaneCapability,
  ControlPlaneDecision,
  type ControlPlaneTrustedSession
} from "./types.js";

const session: ControlPlaneTrustedSession = {
  actorId: "reviewer-1",
  capabilities: [
    ControlPlaneCapability.CollaborationApprove,
    ControlPlaneCapability.CollaborationPropose
  ],
  sessionId: "session-1",
  tenantId: "tenant-1"
};

const proposal = Object.freeze({
  affectedIds: ["root"],
  baseRevision: "revision-000000000001",
  branchId: "main",
  correlationId: "correlation-1",
  idempotencyKey: "proposal-1",
  intent: "Change title",
  operation: "proposal.submit",
  operations: [{ op: "replace", path: "/view/title", value: "Authorized" }],
  proposalId: "proposal-1",
  protocolVersion: "1.0.0",
  requestId: "request-1"
});

it("projects only resource-authorized collaboration capabilities from a trusted session", async () => {
  const decide = vi.fn<ControlPlaneAuthorizationPort["decide"]>(async ({ capability }) =>
    capability === ControlPlaneCapability.CollaborationPropose
      ? ControlPlaneDecision.Allow
      : ControlPlaneDecision.Deny
  );

  const actor = await authorizeCollaborationActor({
    authorization: { decide },
    resourceId: "branch:main",
    session
  });

  expect(actor).toEqual({
    actorId: "reviewer-1",
    actorType: "human",
    capabilities: [CollaborationCapability.Propose],
    tenantId: "tenant-1"
  });
  expect(Object.isFrozen(actor)).toBe(true);
  expect(decide).toHaveBeenCalledTimes(2);
  expect(decide).toHaveBeenCalledWith(
    expect.objectContaining({ resourceId: "branch:main", session })
  );
});

it("drives an authorized proposal without accepting identity fields from the request", async () => {
  const actor = await authorizeCollaborationActor({
    authorization: { decide: async () => ControlPlaneDecision.Allow },
    resourceId: "branch:main",
    session
  });
  const service = referenceService();
  const result = service.execute(proposal, actor);

  expect(result.status, JSON.stringify(result)).toBe(CollaborationStatus.Accepted);
  expect(service.head("main")?.actorId).toBe(session.actorId);
  expect(service.head("main")?.tenantId).toBe(session.tenantId);
});

function referenceService(): ReferenceCollaborationService {
  return new ReferenceCollaborationService({
    clock: { now: () => new Date("2026-08-25T12:00:00.000Z") },
    initialDocument: { ...document(), view: { id: "root", title: "Original", type: "Box" } },
    tenantId: session.tenantId,
    validation: { validate: () => [] }
  });
}
