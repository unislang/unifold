import { expect, expectTypeOf, it } from "vitest";

import type {
  ControlPlaneDurableStorePort,
  ControlPlaneOutboxPort,
  ControlPlaneServicePorts,
  ControlPlaneStorePort
} from "./ports.js";

it("keeps infrastructure behind replaceable ports", () => {
  expectTypeOf<ControlPlaneServicePorts["store"]>().toEqualTypeOf<ControlPlaneStorePort>();
  expectTypeOf<ControlPlaneDurableStorePort>().toMatchTypeOf<ControlPlaneStorePort>();
  expectTypeOf<ControlPlaneDurableStorePort>().toMatchTypeOf<ControlPlaneOutboxPort>();
  expect(true).toBe(true);
});
