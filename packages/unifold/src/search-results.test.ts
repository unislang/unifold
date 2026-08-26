// @vitest-environment happy-dom
import { CoreElementTag } from "@unislang/unifold-catalog";
import { expect, it } from "vitest";

import { defineUnifoldSearchResults } from "./search-results.js";

it("exposes the optional SearchResults family from Unifold", () => {
  expect(defineUnifoldSearchResults(customElements).definedTags).toEqual([
    CoreElementTag.SearchResults
  ]);
});
