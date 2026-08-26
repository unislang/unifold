// @vitest-environment happy-dom
import { expect, it } from "vitest";

import { measureSearchFieldProjection } from "./search-field-fixture.js";

it("keeps 100 bounded SearchFields inside the projection gate", async () => {
  const evidence = await measureSearchFieldProjection();
  expect(evidence.fieldCount).toBe(100);
  expect(evidence.finalValue).toBe("query-49-99");
  expect(evidence.gate.passed).toBe(true);
});
