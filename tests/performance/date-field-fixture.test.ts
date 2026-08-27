// @vitest-environment happy-dom
import { expect, it } from "vitest";

import { measureDateFieldProjection } from "./date-field-fixture.js";

it("keeps 100 DateFields inside the date-only projection gate", async () => {
  const evidence = await measureDateFieldProjection();
  expect(evidence.fieldCount).toBe(100);
  expect(evidence.finalValue).toBe("2026-10-15");
  expect(evidence.sampleCount).toBe(50);
  expect(evidence.gate.passed).toBe(true);
});
