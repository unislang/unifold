import { expect, it } from "vitest";

import * as subject from "./form-structure.js";

it("exposes the optional form-structure public boundary", () => {
  expect(subject).toMatchObject({
    defineUnifoldErrorSummary: expect.any(Function),
    defineUnifoldField: expect.any(Function),
    defineUnifoldFieldset: expect.any(Function)
  });
});
