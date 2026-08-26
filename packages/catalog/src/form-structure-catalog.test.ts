import { CoreComponentType } from "@unislang/unifold-contracts";
import { expect, it } from "vitest";

import { CatalogConstraintKind, CatalogPropertyType, CoreElementTag } from "./enums.js";
import {
  errorSummaryDescriptor,
  fieldDescriptor,
  fieldsetDescriptor,
  MAXIMUM_ERROR_SUMMARY_ITEMS,
  MAXIMUM_FIELDSET_CHILDREN
} from "./form-structure-catalog.js";

it("defines bounded form-structure descriptors", () => {
  expect(fieldDescriptor).toMatchObject({
    componentType: CoreComponentType.Field,
    constraints: [{ kind: CatalogConstraintKind.ChildCount, maximum: 1, minimum: 1 }],
    tagName: CoreElementTag.Field
  });
  expect(fieldsetDescriptor.constraints).toEqual([
    {
      kind: CatalogConstraintKind.ChildCount,
      maximum: MAXIMUM_FIELDSET_CHILDREN,
      minimum: 1
    }
  ]);
  expect(errorSummaryDescriptor).toMatchObject({
    componentType: CoreComponentType.ErrorSummary,
    constraints: [{ maximum: 0, minimum: 0 }],
    tagName: CoreElementTag.ErrorSummary
  });
  expect(errorSummaryDescriptor.properties.find(({ name }) => name === "errors")).toMatchObject({
    defaultValue: [],
    valueType: CatalogPropertyType.ErrorSummaryItemList
  });
  expect(MAXIMUM_ERROR_SUMMARY_ITEMS).toBe(100);
});
