import { CoreComponentType } from "@unislang/unifold-contracts";
import { expect, it } from "vitest";

import { CatalogConstraintKind, CatalogPropertyType, CoreElementTag } from "./enums.js";
import { searchResultsDescriptor } from "./search-results-catalog.js";

it("defines the controlled virtualized SearchResults contract", () => {
  expect(searchResultsDescriptor).toMatchObject({
    componentType: CoreComponentType.SearchResults,
    constraints: [{ kind: CatalogConstraintKind.SearchResultsState }],
    tagName: CoreElementTag.SearchResults
  });
  expect(searchResultsDescriptor.properties).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: "results",
        required: true,
        valueType: CatalogPropertyType.SearchResultList
      }),
      expect.objectContaining({
        defaultValue: { query: "", selectedResultId: "" },
        name: "value",
        valueType: CatalogPropertyType.SearchResultsValue
      })
    ])
  );
});
