// @vitest-environment happy-dom
import { CoreElementTag } from "@unislang/unifold-catalog";
import { expect, it } from "vitest";

import { defineUnifoldSearchField, UnifoldSearchField } from "./search-field.js";

it("publishes the deferred SearchField facade", () => {
  expect(defineUnifoldSearchField()).toMatchObject({
    definedTags: [CoreElementTag.SearchField],
    status: "registered"
  });
  expect(customElements.get(CoreElementTag.SearchField)).toBe(UnifoldSearchField);
});
