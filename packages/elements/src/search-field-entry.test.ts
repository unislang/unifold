// @vitest-environment happy-dom
import { expect, it } from "vitest";

import * as searchField from "./search-field-entry.js";

it("exposes the deferred SearchField feature entry", () => {
  expect(Object.keys(searchField).sort()).toEqual([
    "UnifoldSearchField",
    "defineUnifoldSearchField"
  ]);
});
