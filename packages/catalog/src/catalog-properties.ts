import type { JsonValue } from "@unislang/unifold-contracts";

import { CatalogBindingKind, CatalogPropertyType } from "./enums.js";
import type { CatalogPropertyDescriptor } from "./types.js";

export function catalogProperty(
  name: string,
  valueType: CatalogPropertyType,
  defaultValue?: JsonValue,
  required = false
): CatalogPropertyDescriptor {
  const descriptor = {
    bindingKind: CatalogBindingKind.Property,
    bindingName: name,
    name,
    required,
    valueType
  };
  return defaultValue === undefined ? descriptor : { ...descriptor, defaultValue };
}

export function catalogEnumProperty(
  name: string,
  defaultValue: string,
  enumValues: readonly string[]
): CatalogPropertyDescriptor {
  return {
    ...catalogProperty(name, CatalogPropertyType.Enum, defaultValue),
    enumValues
  };
}

export const catalogTestIdProperty: CatalogPropertyDescriptor = Object.freeze({
  bindingKind: CatalogBindingKind.Attribute,
  bindingName: "data-testid",
  name: "testId",
  required: false,
  valueType: CatalogPropertyType.String
});
