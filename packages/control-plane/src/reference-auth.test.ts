import { expect, it } from "vitest";

import {
  ControlPlaneCapability,
  ControlPlaneDecision,
  type ControlPlaneTrustedSession
} from "./types.js";
import { createReferenceAuthorizationPort, createReferenceIdentityPort } from "./reference-auth.js";

const session: ControlPlaneTrustedSession = {
  actorId: "actor-1",
  capabilities: [ControlPlaneCapability.DocumentRead],
  sessionId: "session-1",
  tenantId: "tenant-a"
};

it("derives identity from the trusted token adapter", async () => {
  const identity = createReferenceIdentityPort({ secret: session });
  await expect(identity.resolve("secret")).resolves.toEqual(session);
  await expect(identity.resolve("client-supplied-tenant")).resolves.toBeUndefined();
  await expect(identity.resolve("toString")).resolves.toBeUndefined();
});

it("denies by default and requires both trusted capability and object grant", async () => {
  const request = {
    capability: ControlPlaneCapability.DocumentRead,
    resourceId: "document-1",
    session
  };
  await expect(createReferenceAuthorizationPort().decide(request)).resolves.toBe(
    ControlPlaneDecision.Deny
  );
  const port = createReferenceAuthorizationPort([
    {
      actorId: "actor-1",
      capability: request.capability,
      resourceId: "document-1",
      tenantId: "tenant-a"
    }
  ]);
  await expect(port.decide(request)).resolves.toBe(ControlPlaneDecision.Allow);
  await expect(port.decide({ ...request, resourceId: "document-2" })).resolves.toBe(
    ControlPlaneDecision.Deny
  );
});
