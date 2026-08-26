import { expect, it } from "vitest";

import { measureDevtoolsPerformance } from "./devtools-fixture.js";

it("retains exact bounded and privacy-aware devtools projections at scale", () => {
  const evidence = measureDevtoolsPerformance(1);
  expect(evidence.verified).toEqual({ nodes: true, timeline: true });
  expect(
    evidence.gates.every(({ passed }) => passed),
    JSON.stringify(evidence.gates)
  ).toBe(true);
});
