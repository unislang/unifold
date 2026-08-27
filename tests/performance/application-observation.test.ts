import { expect, it } from "vitest";

import { measureApplicationObservation } from "./application-observation-fixture.js";

it("fans in exactly authorized events from ten isolated runtimes", () => {
  const evidence = measureApplicationObservation(1);
  expect(evidence.eventCount).toBe(1_000);
  expect(evidence.applicationCount).toBe(10);
  expect(evidence.gate.exact).toBe(true);
  expect(evidence.gate.passed, JSON.stringify(evidence.gate)).toBe(true);
});
