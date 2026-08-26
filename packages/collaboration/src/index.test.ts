import { expect, it } from "vitest";

import {
  CollaborationProtocolVersion,
  CollaborationPresenceRegistry,
  ReferenceCollaborationService,
  isCollaborationRequest
} from "./index.js";

it("exports the supported collaboration surface", () => {
  expect(CollaborationProtocolVersion.Version1).toBe("1.0.0");
  expect(CollaborationPresenceRegistry).toBeTypeOf("function");
  expect(ReferenceCollaborationService).toBeTypeOf("function");
  expect(isCollaborationRequest).toBeTypeOf("function");
});
