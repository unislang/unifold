import { CoreComponentType, type JsonValue } from "@unislang/unifold-contracts";

import {
  CatalogBindingKind,
  CatalogConstraintKind,
  CatalogPropertyType,
  CoreElementTag
} from "./enums.js";
import type { CatalogPropertyDescriptor, ComponentDescriptor } from "./types.js";

export const MAXIMUM_MENU_ITEMS = 100;

const property = (
  name: string,
  valueType: CatalogPropertyType,
  defaultValue?: JsonValue,
  required = false
): CatalogPropertyDescriptor => {
  const descriptor = {
    bindingKind: CatalogBindingKind.Property,
    bindingName: name,
    name,
    required,
    valueType
  };
  return defaultValue === undefined ? descriptor : { ...descriptor, defaultValue };
};

export const menuButtonDescriptor: ComponentDescriptor = {
  componentType: CoreComponentType.MenuButton,
  constraints: [
    {
      kind: CatalogConstraintKind.UniqueOptionValues,
      optionsProperty: "items"
    }
  ],
  properties: [
    property("label", CatalogPropertyType.String, undefined, true),
    property("items", CatalogPropertyType.MenuItemList, undefined, true),
    property("disabled", CatalogPropertyType.Boolean, false),
    {
      bindingKind: CatalogBindingKind.Attribute,
      bindingName: "data-testid",
      name: "testId",
      required: false,
      valueType: CatalogPropertyType.String
    }
  ],
  tagName: CoreElementTag.MenuButton,
  version: "1.0.0"
};
