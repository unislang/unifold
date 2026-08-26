import { expect, it, vi } from "vitest";

import {
  createOpenFgaAuthorizationPort,
  openFgaTupleForAuthorizationRequest,
  type OpenFgaCheckClient
} from "./openfga-authorization.js";
import {
  ControlPlaneCapability,
  ControlPlaneDecision,
  type ControlPlaneAuthorizationRequest
} from "./types.js";

const request: ControlPlaneAuthorizationRequest = {
  capability: ControlPlaneCapability.DocumentRead,
  resourceId: "folder:main~draft",
  session: {
    actorId: "actor:one~admin",
    capabilities: [ControlPlaneCapability.DocumentRead],
    sessionId: "session-1",
    tenantId: "tenant:one~root"
  }
};

it("maps an exact tenant-scoped tuple and pins the authorization model", async () => {
  const check = vi.fn<OpenFgaCheckClient["check"]>(async () => ({ allowed: true }));
  const port = createOpenFgaAuthorizationPort({
    authorizationModelId: "01JMODEL000000000000000001",
    client: { check }
  });

  await expect(port.decide(request)).resolves.toBe(ControlPlaneDecision.Allow);
  expect(check).toHaveBeenCalledWith(
    {
      object: "unifold_resource:tenant%3Aone%7Eroot~folder%3Amain%7Edraft",
      relation: "document_read",
      user: "unifold_principal:tenant%3Aone%7Eroot~actor%3Aone%7Eadmin"
    },
    { authorizationModelId: "01JMODEL000000000000000001" }
  );
});

it("denies locally when the trusted session lacks the capability", async () => {
  const check = vi.fn<OpenFgaCheckClient["check"]>();
  const port = createOpenFgaAuthorizationPort({
    authorizationModelId: "model-1",
    client: { check }
  });
  const denied = { ...request, session: { ...request.session, capabilities: [] } };
  await expect(port.decide(denied)).resolves.toBe(ControlPlaneDecision.Deny);
  expect(check).not.toHaveBeenCalled();
});

it.each([
  ["false", async () => ({ allowed: false })],
  ["missing", async () => ({})],
  ["failure", async () => Promise.reject(new Error("private provider failure"))]
])("fails closed for a %s provider result", async (_label, implementation) => {
  const port = createOpenFgaAuthorizationPort({
    authorizationModelId: "model-1",
    client: { check: implementation }
  });
  await expect(port.decide(request)).resolves.toBe(ControlPlaneDecision.Deny);
});

it("rejects invalid identities and configuration without contacting the provider", async () => {
  const check = vi.fn<OpenFgaCheckClient["check"]>();
  const port = createOpenFgaAuthorizationPort({
    authorizationModelId: "model-1",
    client: { check }
  });
  await expect(port.decide({ ...request, resourceId: "bad\nresource" })).resolves.toBe(
    ControlPlaneDecision.Deny
  );
  expect(openFgaTupleForAuthorizationRequest({ ...request, resourceId: "" })).toBeUndefined();
  expect(check).not.toHaveBeenCalled();
  expect(() =>
    createOpenFgaAuthorizationPort({ authorizationModelId: "", client: { check } })
  ).toThrow(TypeError);
});
