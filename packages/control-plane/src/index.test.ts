import { expect, it } from "vitest";

import * as subject from "./index.js";

it("exposes the supported control-plane facade", () => {
  expect(subject.createControlPlaneService).toBeTypeOf("function");
  expect(subject.createControlPlaneHttpClient).toBeTypeOf("function");
  expect(subject.createControlPlaneHttpHandler).toBeTypeOf("function");
  expect(subject.createControlPlaneRealtimeCursor).toBeTypeOf("function");
  expect(subject.createReferenceControlPlane).toBeTypeOf("function");
  expect(subject.authorizeCollaborationActor).toBeTypeOf("function");
});
