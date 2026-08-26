import { CoreComponentType } from "@unislang/unifold-contracts";

import { catalogEnumProperty, catalogProperty } from "./catalog-properties.js";
import {
  CatalogConstraintKind,
  CatalogPropertyType,
  CoreElementTag,
  SearchFieldAutocomplete
} from "./enums.js";
import {
  MAXIMUM_SEARCH_QUERY_LENGTH,
  searchQueryLengthConstraint
} from "./search-query-catalog.js";
import { textControlProperties } from "./text-control-catalog.js";
import type { ComponentDescriptor } from "./types.js";

export const searchFieldDescriptor: ComponentDescriptor = Object.freeze({
  componentType: CoreComponentType.SearchField,
  constraints: Object.freeze([
    Object.freeze({ kind: CatalogConstraintKind.ChildCount, maximum: 0, minimum: 0 }),
    Object.freeze(searchQueryLengthConstraint("value"))
  ]),
  properties: Object.freeze(
    textControlProperties(
      [
        catalogEnumProperty(
          "autocomplete",
          SearchFieldAutocomplete.Off,
          Object.values(SearchFieldAutocomplete)
        ),
        catalogProperty(
          "maxLength",
          CatalogPropertyType.PositiveInteger,
          MAXIMUM_SEARCH_QUERY_LENGTH
        )
      ],
      true
    )
  ),
  tagName: CoreElementTag.SearchField,
  version: "1.0.0"
});
