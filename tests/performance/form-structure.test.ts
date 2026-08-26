// @vitest-environment happy-dom
import { expect, it } from "vitest";

import { measureErrorSummaryProjection } from "./form-structure-fixture.js";

it("keeps a maximum-sized error summary inside its projection gate", async () => {
  const evidence = await measureErrorSummaryProjection();
  expect(evidence.errorCount).toBe(100);
  expect(evidence.gate.actualLinkCount).toBe(100);
  expect(evidence.gate.passed).toBe(true);
});
