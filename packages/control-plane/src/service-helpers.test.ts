import { expect, it } from "vitest";

import {
  ControlPlaneOperation,
  ControlPlaneProtocolVersion,
  type ControlPlaneAuthenticatedRequest
} from "./types.js";
import { validRequest, validSequence, validText } from "./service-helpers.js";

const request: ControlPlaneAuthenticatedRequest = {
  correlationId: "correlation-1",
  operation: ControlPlaneOperation.DocumentRead,
  protocolVersion: ControlPlaneProtocolVersion.Version1,
  requestId: "request-1",
  sessionToken: "secret"
};

it("rejects mismatched protocol operations and invalid sequence cursors", () => {
  expect(validRequest(request, ControlPlaneOperation.DocumentRead)).toBe(true);
  expect(validRequest(request, ControlPlaneOperation.DocumentCommit)).toBe(false);
  expect(validSequence(-1)).toBe(false);
  expect(validText("  ")).toBe(false);
});
