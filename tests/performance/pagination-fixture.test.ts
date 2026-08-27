// @vitest-environment happy-dom
import { expect, it } from "vitest";

import { measurePaginationProjection } from "./pagination-fixture.js";

it("projects one hundred Pagination sequences within the bounded gate", async () => {
  const evidence = await measurePaginationProjection();
  expect(evidence).toMatchObject({
    finalCurrentPage: "2",
    gate: { passed: true },
    paginationCount: 100,
    sampleCount: 50
  });
});
