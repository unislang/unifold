import { expect, it } from "vitest";

import { CatalogConstraintKind } from "./enums.js";
import {
  MAXIMUM_SEARCH_QUERY_LENGTH,
  searchQueryLengthConstraint
} from "./search-query-catalog.js";

it("owns one reusable bounded search-query contract", () => {
  expect(MAXIMUM_SEARCH_QUERY_LENGTH).toBe(2_048);
  expect(searchQueryLengthConstraint("value", "query")).toEqual({
    kind: CatalogConstraintKind.SearchQueryLength,
    maximumProperty: "maxLength",
    queryProperty: "query",
    valueProperty: "value"
  });
});
