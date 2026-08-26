import { CoreComponentType, UiUpdateTrigger } from "@unislang/unifold-contracts";

import {
  catalogEnumProperty,
  catalogProperty,
  catalogTestIdProperty
} from "./catalog-properties.js";
import { CatalogConstraintKind, CatalogPropertyType, CoreElementTag } from "./enums.js";
import type { ComponentDescriptor } from "./types.js";

export const numberFieldDescriptor: ComponentDescriptor = {
  componentType: CoreComponentType.NumberField,
  constraints: [
    { kind: CatalogConstraintKind.ChildCount, maximum: 0, minimum: 0 },
    {
      kind: CatalogConstraintKind.NumberFieldRange,
      maximumProperty: "max",
      minimumProperty: "min",
      stepProperty: "step",
      valueProperty: "value"
    }
  ],
  properties: [
    catalogProperty("asyncValidators", CatalogPropertyType.StringArray, []),
    catalogProperty("disabled", CatalogPropertyType.Boolean, false),
    catalogProperty("errorMessage", CatalogPropertyType.String, ""),
    catalogProperty("label", CatalogPropertyType.String, undefined, true),
    catalogProperty("max", CatalogPropertyType.NullableNumber, null),
    catalogProperty("min", CatalogPropertyType.NullableNumber, null),
    catalogProperty("name", CatalogPropertyType.String, ""),
    catalogProperty("placeholder", CatalogPropertyType.String, ""),
    catalogProperty("readonly", CatalogPropertyType.Boolean, false),
    catalogProperty("required", CatalogPropertyType.Boolean, false),
    catalogProperty("step", CatalogPropertyType.PositiveNumber, 1),
    catalogEnumProperty("updateOn", UiUpdateTrigger.Input, Object.values(UiUpdateTrigger)),
    catalogProperty("validators", CatalogPropertyType.StringArray, []),
    catalogProperty("value", CatalogPropertyType.NullableNumber, null),
    catalogTestIdProperty
  ],
  tagName: CoreElementTag.NumberField,
  version: "1.0.0"
};
