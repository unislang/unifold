import { CoreComponentType, UiUpdateTrigger } from "@unislang/unifold-contracts";

import { CatalogConstraintKind, CatalogPropertyType, CoreElementTag } from "./enums.js";
import {
  MAXIMUM_SEARCH_QUERY_LENGTH,
  searchQueryLengthConstraint
} from "./search-query-catalog.js";
import type { ComponentDescriptor } from "./types.js";
import {
  catalogEnumProperty as enumProperty,
  catalogProperty as property,
  catalogTestIdProperty as testId
} from "./catalog-properties.js";

export const searchResultsDescriptor: ComponentDescriptor = {
  componentType: CoreComponentType.SearchResults,
  constraints: [
    {
      kind: CatalogConstraintKind.SearchResultsState,
      resultsProperty: "results",
      valueProperty: "value"
    },
    searchQueryLengthConstraint("value", "query")
  ],
  properties: [
    property("label", CatalogPropertyType.String, undefined, true),
    property("results", CatalogPropertyType.SearchResultList, undefined, true),
    property("value", CatalogPropertyType.SearchResultsValue, {
      query: "",
      selectedResultId: ""
    }),
    property("resultsLabel", CatalogPropertyType.String, "Search results"),
    property("placeholder", CatalogPropertyType.String, ""),
    property("emptyMessage", CatalogPropertyType.String, "No results"),
    property("loading", CatalogPropertyType.Boolean, false),
    property("loadingMessage", CatalogPropertyType.String, "Loading results"),
    property("disabled", CatalogPropertyType.Boolean, false),
    property("errorMessage", CatalogPropertyType.String, ""),
    property("name", CatalogPropertyType.String, ""),
    property("maxLength", CatalogPropertyType.PositiveInteger, MAXIMUM_SEARCH_QUERY_LENGTH),
    enumProperty("updateOn", UiUpdateTrigger.Input, Object.values(UiUpdateTrigger)),
    property("validators", CatalogPropertyType.StringArray, []),
    property("asyncValidators", CatalogPropertyType.StringArray, []),
    property("itemHeight", CatalogPropertyType.PositiveInteger, 72),
    property("overscan", CatalogPropertyType.PositiveInteger, 4),
    property("viewportHeight", CatalogPropertyType.PositiveInteger, 480),
    testId
  ],
  tagName: CoreElementTag.SearchResults,
  version: "1.0.0"
};
