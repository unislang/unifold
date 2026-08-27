import { CoreComponentType } from "@unislang/unifold-contracts";

import {
  catalogProperty as property,
  catalogTestIdProperty as testId
} from "./catalog-properties.js";
import { CatalogConstraintKind, CatalogPropertyType, CoreElementTag } from "./enums.js";
import type { ComponentDescriptor } from "./types.js";

export const MAXIMUM_PAGINATION_ITEMS = 100;

export const paginationDescriptor: ComponentDescriptor = Object.freeze({
  componentType: CoreComponentType.Pagination,
  constraints: Object.freeze([
    Object.freeze({ kind: CatalogConstraintKind.PaginationData, itemsProperty: "items" }),
    Object.freeze({ kind: CatalogConstraintKind.ChildCount, maximum: 0, minimum: 0 })
  ]),
  properties: Object.freeze([
    Object.freeze({
      ...property("items", CatalogPropertyType.PaginationItemList, undefined, true),
      maximumItems: MAXIMUM_PAGINATION_ITEMS,
      minimumItems: 1
    }),
    Object.freeze({
      ...property("label", CatalogPropertyType.String, undefined, true),
      maximumLength: 512,
      minimumLength: 1
    }),
    testId
  ]),
  tagName: CoreElementTag.Pagination,
  version: "1.0.0"
});
