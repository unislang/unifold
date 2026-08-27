import { CoreComponentType } from "@unislang/unifold-contracts";
import { expect, it } from "vitest";

import { CatalogConstraintKind, CatalogPropertyType, CoreElementTag } from "./enums.js";
import { MAXIMUM_PAGINATION_ITEMS, paginationDescriptor } from "./pagination-catalog.js";

it("publishes a bounded Pagination navigation contract", () => {
  expect(paginationDescriptor).toMatchObject({
    componentType: CoreComponentType.Pagination,
    tagName: CoreElementTag.Pagination
  });
  expect(paginationDescriptor.constraints).toEqual([
    { itemsProperty: "items", kind: CatalogConstraintKind.PaginationData },
    { kind: CatalogConstraintKind.ChildCount, maximum: 0, minimum: 0 }
  ]);
  expect(property("items")).toMatchObject({
    maximumItems: MAXIMUM_PAGINATION_ITEMS,
    minimumItems: 1,
    required: true,
    valueType: CatalogPropertyType.PaginationItemList
  });
  expect(property("label")).toMatchObject({ maximumLength: 512, minimumLength: 1, required: true });
});

function property(name: string) {
  return paginationDescriptor.properties.find((candidate) => candidate.name === name);
}
