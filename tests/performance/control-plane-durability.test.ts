import { expect, it } from "vitest";

import { measureControlPlaneDurabilityPerformance } from "./control-plane-durability-fixture.js";

it("commits and drains an exact bounded SQLite control-plane workload", async () => {
  const evidence = await measureControlPlaneDurabilityPerformance(1);
  expect(evidence.verified).toEqual({ commits: true, outbox: true, recovery: true });
  expect(
    evidence.gates.every(({ passed }) => passed),
    JSON.stringify(evidence.gates)
  ).toBe(true);
});
