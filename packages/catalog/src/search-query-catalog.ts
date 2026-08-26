import { CatalogConstraintKind } from "./enums.js";
import type { CatalogSearchQueryLengthConstraint } from "./types.js";

export const MAXIMUM_SEARCH_QUERY_LENGTH = 2_048;

export function searchQueryLengthConstraint(
  valueProperty: string,
  queryProperty: string | null = null
): CatalogSearchQueryLengthConstraint {
  return {
    kind: CatalogConstraintKind.SearchQueryLength,
    maximumProperty: "maxLength",
    queryProperty,
    valueProperty
  };
}
