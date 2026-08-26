// @vitest-environment happy-dom
import { expect, it } from "vitest";

import { measureAsyncStorePerformance } from "./async-store-fixture.js";

it("preserves exact async commit and mounted projection behavior within bounded gates", async () => {
  const evidence = await measureAsyncStorePerformance(1);
  expect(evidence.verified).toEqual({ commits: true, projections: true });
  expect(
    evidence.gates.every(({ passed }) => passed),
    JSON.stringify(evidence.gates)
  ).toBe(true);
});
