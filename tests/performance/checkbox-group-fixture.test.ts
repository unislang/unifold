// @vitest-environment happy-dom
import { expect, it } from "vitest";

import { measureCheckboxGroupProjection } from "./checkbox-group-fixture.js";

it("keeps 100 realistic CheckboxGroups inside the projection gate", async () => {
  const evidence = await measureCheckboxGroupProjection();
  expect(evidence.groupCount).toBe(100);
  expect(evidence.controlCount).toBe(600);
  expect(evidence.finalValue).toEqual(["billing", "accessibility"]);
  expect(evidence.gate.passed).toBe(true);
});
