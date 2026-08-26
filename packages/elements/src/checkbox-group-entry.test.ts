// @vitest-environment happy-dom
import { expect, it } from "vitest";

import * as checkboxGroup from "./checkbox-group-entry.js";

it("exposes the deferred CheckboxGroup feature entry", () => {
  expect(Object.keys(checkboxGroup).sort()).toEqual([
    "UnifoldCheckboxGroup",
    "defineUnifoldCheckboxGroup"
  ]);
});
