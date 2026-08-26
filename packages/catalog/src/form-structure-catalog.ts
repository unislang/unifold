import { CoreComponentType } from "@unislang/unifold-contracts";

import {
  catalogProperty as property,
  catalogTestIdProperty as testId
} from "./catalog-properties.js";
import { CatalogConstraintKind, CatalogPropertyType, CoreElementTag } from "./enums.js";
import type { ComponentDescriptor } from "./types.js";

export const MAXIMUM_ERROR_SUMMARY_ITEMS = 100;
export const MAXIMUM_FIELDSET_CHILDREN = 100;

export const fieldDescriptor: ComponentDescriptor = Object.freeze({
  componentType: CoreComponentType.Field,
  constraints: Object.freeze([
    Object.freeze({ kind: CatalogConstraintKind.ChildCount, maximum: 1, minimum: 1 })
  ]),
  properties: Object.freeze([
    property("errorMessage", CatalogPropertyType.String, ""),
    property("helpText", CatalogPropertyType.String, ""),
    property("label", CatalogPropertyType.String, ""),
    property("required", CatalogPropertyType.Boolean, false),
    testId
  ]),
  tagName: CoreElementTag.Field,
  version: "1.0.0"
});

export const fieldsetDescriptor: ComponentDescriptor = Object.freeze({
  componentType: CoreComponentType.Fieldset,
  constraints: Object.freeze([
    Object.freeze({
      kind: CatalogConstraintKind.ChildCount,
      maximum: MAXIMUM_FIELDSET_CHILDREN,
      minimum: 1
    })
  ]),
  properties: Object.freeze([
    property("disabled", CatalogPropertyType.Boolean, false),
    property("helpText", CatalogPropertyType.String, ""),
    property("label", CatalogPropertyType.String, ""),
    testId
  ]),
  tagName: CoreElementTag.Fieldset,
  version: "1.0.0"
});

export const errorSummaryDescriptor: ComponentDescriptor = Object.freeze({
  componentType: CoreComponentType.ErrorSummary,
  constraints: Object.freeze([
    Object.freeze({ kind: CatalogConstraintKind.ChildCount, maximum: 0, minimum: 0 })
  ]),
  properties: Object.freeze([
    property("errors", CatalogPropertyType.ErrorSummaryItemList, []),
    property("title", CatalogPropertyType.String, "There is a problem"),
    testId
  ]),
  tagName: CoreElementTag.ErrorSummary,
  version: "1.0.0"
});
