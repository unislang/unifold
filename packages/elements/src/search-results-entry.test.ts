// @vitest-environment happy-dom
import { CoreElementTag } from "@unislang/unifold-catalog";
import { expect, it } from "vitest";

import { defineUnifoldSearchResults } from "./search-results-entry.js";

it("registers the deferred SearchResults family", () => {
  expect(defineUnifoldSearchResults(customElements).definedTags).toEqual([
    CoreElementTag.SearchResults
  ]);
});
