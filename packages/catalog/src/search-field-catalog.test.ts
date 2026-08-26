import { CoreComponentType } from "@unislang/unifold-contracts";
import { expect, it } from "vitest";

import { CatalogConstraintKind, CoreElementTag, SearchFieldAutocomplete } from "./enums.js";
import { MAXIMUM_SEARCH_QUERY_LENGTH } from "./search-query-catalog.js";
import { searchFieldDescriptor } from "./search-field-catalog.js";

it("publishes one labeled enum-backed native search control", () => {
  expect(searchFieldDescriptor).toMatchObject({
    componentType: CoreComponentType.SearchField,
    tagName: CoreElementTag.SearchField
  });
  expect(searchFieldDescriptor.properties.find(({ name }) => name === "label")).toMatchObject({
    required: true
  });
  expect(
    searchFieldDescriptor.properties.find(({ name }) => name === "autocomplete")
  ).toMatchObject({
    defaultValue: SearchFieldAutocomplete.Off,
    enumValues: Object.values(SearchFieldAutocomplete)
  });
  expect(searchFieldDescriptor.constraints).toContainEqual(
    expect.objectContaining({ kind: CatalogConstraintKind.ChildCount, maximum: 0 })
  );
  expect(searchFieldDescriptor.properties.find(({ name }) => name === "maxLength")).toMatchObject({
    defaultValue: MAXIMUM_SEARCH_QUERY_LENGTH
  });
});
