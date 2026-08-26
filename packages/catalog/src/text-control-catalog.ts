import { UiUpdateTrigger } from "@unislang/unifold-contracts";

import {
  catalogEnumProperty,
  catalogProperty,
  catalogTestIdProperty
} from "./catalog-properties.js";
import { CatalogPropertyType } from "./enums.js";
import type { CatalogPropertyDescriptor } from "./types.js";

export function textControlProperties(
  specific: readonly CatalogPropertyDescriptor[],
  requireLabel = false
): readonly CatalogPropertyDescriptor[] {
  return [
    catalogProperty("disabled", CatalogPropertyType.Boolean, false),
    catalogProperty("errorMessage", CatalogPropertyType.String, ""),
    labelProperty(requireLabel),
    catalogProperty("name", CatalogPropertyType.String, ""),
    catalogProperty("placeholder", CatalogPropertyType.String, ""),
    catalogProperty("readonly", CatalogPropertyType.Boolean, false),
    catalogProperty("required", CatalogPropertyType.Boolean, false),
    catalogEnumProperty("updateOn", UiUpdateTrigger.Input, Object.values(UiUpdateTrigger)),
    catalogProperty("value", CatalogPropertyType.String, ""),
    catalogProperty("validators", CatalogPropertyType.StringArray, []),
    catalogProperty("asyncValidators", CatalogPropertyType.StringArray, []),
    ...specific,
    catalogTestIdProperty
  ];
}

function labelProperty(required: boolean): CatalogPropertyDescriptor {
  return catalogProperty("label", CatalogPropertyType.String, required ? undefined : "", required);
}
