import { CoreComponentType } from "@unislang/unifold-contracts";
import { expect, it } from "vitest";

import { breadcrumbDescriptor, MAXIMUM_BREADCRUMB_ITEMS } from "./breadcrumb-catalog.js";
import { BreadcrumbSeparator, CatalogConstraintKind, CoreElementTag } from "./enums.js";

it("defines a bounded enum-backed native Breadcrumb contract", () => {
  expect(breadcrumbDescriptor).toMatchObject({
    componentType: CoreComponentType.Breadcrumb,
    tagName: CoreElementTag.Breadcrumb
  });
  expect(breadcrumbDescriptor.constraints).toEqual([
    { itemsProperty: "items", kind: CatalogConstraintKind.BreadcrumbData },
    { kind: CatalogConstraintKind.ChildCount, maximum: 0, minimum: 0 }
  ]);
  expect(breadcrumbDescriptor.properties.find(({ name }) => name === "separator")).toMatchObject({
    defaultValue: BreadcrumbSeparator.Chevron,
    enumValues: Object.values(BreadcrumbSeparator)
  });
  expect(MAXIMUM_BREADCRUMB_ITEMS).toBe(32);
});
