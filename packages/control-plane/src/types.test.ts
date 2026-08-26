import { Ajv2020 } from "ajv/dist/2020.js";
import { readFile } from "node:fs/promises";
import { expect, it } from "vitest";

import {
  ControlPlaneCapability,
  ControlPlaneOperation,
  ControlPlaneOperationStatus,
  ControlPlaneProtocolVersion,
  ControlPlaneSchemaUri,
  ControlPlaneTenantIsolationTier
} from "./types.js";

it("uses enum-backed version, capability, status, and isolation values", () => {
  expect(ControlPlaneProtocolVersion.Version1).toBe("1.0.0");
  expect(ControlPlaneSchemaUri.Version1).toContain("/control-plane/1.0/");
  expect(ControlPlaneCapability.DocumentCommit).toBe("document.commit");
  expect(ControlPlaneCapability.CollaborationPropose).toBe("collaboration.propose");
  expect(ControlPlaneOperation.EffectInvoke).toBe("effect.invoke");
  expect(ControlPlaneOperationStatus.Denied).toBe("denied");
  expect(ControlPlaneTenantIsolationTier.SharedSchemaTenantKey).toBe("shared-schema-tenant-key");
});

it("validates versioned requests and rejects client-supplied tenant authority", async () => {
  const schema = JSON.parse(
    await readFile(new URL("../schemas/control-plane.schema.json", import.meta.url), "utf8")
  );
  const validate = new Ajv2020({ allErrors: true, strict: true }).compile(schema);
  const request = {
    correlationId: "correlation-1",
    document: { id: "document-1" },
    objectId: "document-1",
    operation: ControlPlaneOperation.DocumentCommit,
    protocolVersion: ControlPlaneProtocolVersion.Version1,
    requestId: "request-1",
    sessionToken: "opaque-session"
  };
  expect(validate(request)).toBe(true);
  expect(validate({ ...request, tenantId: "client-tenant" })).toBe(false);
});
