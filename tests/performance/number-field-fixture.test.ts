// @vitest-environment happy-dom
import { expect, it } from "vitest";

import { measureNumberFieldProjection } from "./number-field-fixture.js";

it("keeps 100 bounded NumberFields inside the projection gate", async () => {
  const evidence = await measureNumberFieldProjection();
  expect(evidence.fieldCount).toBe(100);
  expect(evidence.finalValue).toBe(123.5);
  expect(evidence.gate.passed).toBe(true);
});
