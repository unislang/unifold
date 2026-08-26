// @vitest-environment happy-dom
import { expect, it } from "vitest";

import { measureContentMediaProjection } from "./content-media-fixture.js";

it("keeps 100 Card/Image pairs inside the projection gate", async () => {
  const evidence = await measureContentMediaProjection();
  expect(evidence.cardCount).toBe(100);
  expect(evidence.imageCount).toBe(100);
  expect(evidence.gate.passed).toBe(true);
});
