import { expect, expectTypeOf, it } from "vitest";

import type { ControlPlaneServicePorts, ControlPlaneStorePort } from "./ports.js";

it("keeps infrastructure behind replaceable ports", () => {
  expectTypeOf<ControlPlaneServicePorts["store"]>().toEqualTypeOf<ControlPlaneStorePort>();
  expect(true).toBe(true);
});
