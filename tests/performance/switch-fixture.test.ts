// @vitest-environment happy-dom
import { expect, it } from "vitest";

import { measureSwitchProjection } from "./switch-fixture.js";

it("keeps 100 Switches inside the projection gate", async () => {
  const evidence = await measureSwitchProjection();
  expect(evidence.switchCount).toBe(100);
  expect(evidence.finalValue).toBe(true);
  expect(evidence.sampleCount).toBe(50);
  expect(evidence.gate.passed).toBe(true);
});
