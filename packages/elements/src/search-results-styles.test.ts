import { expect, it } from "vitest";

import { searchResultsStyles } from "./search-results-styles.js";

it("owns the complete token-backed SearchResults style set", () => {
  expect(searchResultsStyles).toHaveLength(4);
});
