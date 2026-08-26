import { expect, it } from "vitest";

import { measureCollaborationPerformance } from "./collaboration-fixture.js";

it("commits and auto-rebases an exact 1k collaboration history", () => {
  const evidence = measureCollaborationPerformance(1);

  expect(evidence.verified).toEqual({
    commits: true,
    document: true,
    rebase: true,
    sequence: true
  });
  expect(
    evidence.gates.every(({ passed }) => passed),
    JSON.stringify(evidence.gates)
  ).toBe(true);
});
