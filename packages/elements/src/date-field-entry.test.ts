// @vitest-environment happy-dom
import { expect, it } from "vitest";

import * as dateFieldFamily from "./date-field-entry.js";

it("exposes only the deferred DateField feature boundary", () => {
  expect(Object.keys(dateFieldFamily).sort()).toEqual([
    "UnifoldDateField",
    "defineUnifoldDateField"
  ]);
});
