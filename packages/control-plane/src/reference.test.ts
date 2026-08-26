import { expect, it } from "vitest";

import { referenceOptions } from "./control-plane.test-data.js";
import { createReferenceControlPlane } from "./reference.js";
import {
  ControlPlaneOperation,
  ControlPlaneOperationStatus,
  ControlPlaneProtocolVersion,
  ControlPlaneTenantIsolationTier
} from "./types.js";

it("ships a deny-by-default local adapter without coupling the runtime to a server", async () => {
  const reference = createReferenceControlPlane(referenceOptions());
  const result = await reference.service.readDocument({
    correlationId: "correlation-1",
    objectId: "document-1",
    operation: ControlPlaneOperation.DocumentRead,
    protocolVersion: ControlPlaneProtocolVersion.Version1,
    requestId: "request-1",
    sessionToken: "token-a"
  });
  expect(reference.isolationTier).toBe(ControlPlaneTenantIsolationTier.SharedSchemaTenantKey);
  expect(result.status).toBe(ControlPlaneOperationStatus.Denied);
});
