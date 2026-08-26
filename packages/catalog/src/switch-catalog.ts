import { CoreComponentType, UiUpdateTrigger } from "@unislang/unifold-contracts";

import {
  catalogEnumProperty,
  catalogProperty,
  catalogTestIdProperty
} from "./catalog-properties.js";
import { CatalogConstraintKind, CatalogPropertyType, CoreElementTag } from "./enums.js";
import type { CatalogConstraintDescriptor, ComponentDescriptor } from "./types.js";

export const switchDescriptor: ComponentDescriptor = Object.freeze({
  componentType: CoreComponentType.Switch,
  constraints: [
    { kind: CatalogConstraintKind.ChildCount, maximum: 0, minimum: 0 }
  ] satisfies readonly CatalogConstraintDescriptor[],
  properties: Object.freeze([
    catalogProperty("disabled", CatalogPropertyType.Boolean, false),
    catalogProperty("errorMessage", CatalogPropertyType.String, ""),
    {
      minimumLength: 1,
      name: "label",
      required: true,
      valueType: CatalogPropertyType.String
    },
    catalogProperty("name", CatalogPropertyType.String, ""),
    catalogProperty("required", CatalogPropertyType.Boolean, false),
    catalogEnumProperty("updateOn", UiUpdateTrigger.Input, Object.values(UiUpdateTrigger)),
    catalogProperty("value", CatalogPropertyType.Boolean, false),
    catalogProperty("validators", CatalogPropertyType.StringArray, []),
    catalogProperty("asyncValidators", CatalogPropertyType.StringArray, []),
    catalogTestIdProperty
  ]),
  tagName: CoreElementTag.Switch,
  version: "1.0.0"
});
