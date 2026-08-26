import { CoreComponentType, type JsonValue } from "@unislang/unifold-contracts";

import {
  CatalogBindingKind,
  CatalogConstraintKind,
  CatalogPropertyType,
  CoreElementTag,
  TooltipPlacement
} from "./enums.js";
import type { CatalogPropertyDescriptor, ComponentDescriptor } from "./types.js";

function property(
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

export const tooltipDescriptor: ComponentDescriptor = {
  componentType: CoreComponentType.Tooltip,
  constraints: [{ kind: CatalogConstraintKind.ChildCount, maximum: 0, minimum: 0 }],
  properties: [
    property("label", CatalogPropertyType.String, undefined, true),
    property("content", CatalogPropertyType.String, undefined, true),
    {
      ...property("placement", CatalogPropertyType.Enum, TooltipPlacement.Top),
      enumValues: Object.values(TooltipPlacement)
    },
    {
      bindingKind: CatalogBindingKind.Attribute,
      bindingName: "data-testid",
      name: "testId",
      required: false,
      valueType: CatalogPropertyType.String
    }
  ],
  tagName: CoreElementTag.Tooltip,
  version: "1.0.0"
};
