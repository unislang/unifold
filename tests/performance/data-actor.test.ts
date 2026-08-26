import { expect, it } from "vitest";

import { measureDataActorPerformance } from "./data-actor-fixture.js";

it("serves and invalidates an exact 1k remote-data working set", async () => {
  const evidence = await measureDataActorPerformance(1);

  expect(evidence.handlerInvocations).toBe(evidence.queryCount);
  expect(
    evidence.gates.every(({ passed }) => passed),
    JSON.stringify(evidence.gates)
  ).toBe(true);
});
