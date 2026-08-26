import { CoreComponentType } from "@unislang/unifold-contracts";

import {
  catalogEnumProperty as enumProperty,
  catalogProperty as property,
  catalogTestIdProperty as testId
} from "./catalog-properties.js";
import {
  BreadcrumbSeparator,
  CatalogConstraintKind,
  CatalogPropertyType,
  CoreElementTag
} from "./enums.js";
import type { ComponentDescriptor } from "./types.js";

export const MAXIMUM_BREADCRUMB_ITEMS = 32;

export const breadcrumbDescriptor: ComponentDescriptor = {
  componentType: CoreComponentType.Breadcrumb,
  constraints: [
    { kind: CatalogConstraintKind.BreadcrumbData, itemsProperty: "items" },
    { kind: CatalogConstraintKind.ChildCount, maximum: 0, minimum: 0 }
  ],
  properties: [
    property("label", CatalogPropertyType.String, undefined, true),
    property("items", CatalogPropertyType.BreadcrumbItemList, undefined, true),
    property("compact", CatalogPropertyType.Boolean, false),
    enumProperty("separator", BreadcrumbSeparator.Chevron, Object.values(BreadcrumbSeparator)),
    testId
  ],
  tagName: CoreElementTag.Breadcrumb,
  version: "1.0.0"
};
