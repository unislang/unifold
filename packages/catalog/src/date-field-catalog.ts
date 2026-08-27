import { CoreComponentType, UiUpdateTrigger } from "@unislang/unifold-contracts";

import {
  catalogEnumProperty,
  catalogProperty,
  catalogTestIdProperty
} from "./catalog-properties.js";
import {
  CatalogConstraintKind,
  CatalogPropertyType,
  CoreElementTag,
  DateFieldAutocomplete
} from "./enums.js";
import type { ComponentDescriptor } from "./types.js";

export const dateFieldDescriptor: ComponentDescriptor = Object.freeze({
  componentType: CoreComponentType.DateField,
  constraints: Object.freeze([
    Object.freeze({ kind: CatalogConstraintKind.ChildCount, maximum: 0, minimum: 0 }),
    Object.freeze({
      kind: CatalogConstraintKind.DateFieldRange,
      maximumProperty: "max",
      minimumProperty: "min",
      stepProperty: "step",
      valueProperty: "value"
    })
  ]),
  properties: Object.freeze([
    catalogProperty("asyncValidators", CatalogPropertyType.StringArray, []),
    catalogEnumProperty(
      "autocomplete",
      DateFieldAutocomplete.Off,
      Object.values(DateFieldAutocomplete)
    ),
    catalogProperty("disabled", CatalogPropertyType.Boolean, false),
    catalogProperty("errorMessage", CatalogPropertyType.String, ""),
    { minimumLength: 1, name: "label", required: true, valueType: CatalogPropertyType.String },
    catalogProperty("max", CatalogPropertyType.Date, ""),
    catalogProperty("min", CatalogPropertyType.Date, ""),
    catalogProperty("name", CatalogPropertyType.String, ""),
    catalogProperty("readonly", CatalogPropertyType.Boolean, false),
    catalogProperty("required", CatalogPropertyType.Boolean, false),
    catalogProperty("step", CatalogPropertyType.PositiveInteger, 1),
    catalogEnumProperty("updateOn", UiUpdateTrigger.Input, Object.values(UiUpdateTrigger)),
    catalogProperty("validators", CatalogPropertyType.StringArray, []),
    catalogProperty("value", CatalogPropertyType.Date, ""),
    catalogTestIdProperty
  ]),
  tagName: CoreElementTag.DateField,
  version: "1.0.0"
});
