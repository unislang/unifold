import { CoreComponentType } from "@unislang/unifold-contracts";

import {
  CatalogConstraintKind,
  CatalogPropertyType,
  CoreElementTag,
  TooltipPlacement
} from "./enums.js";
import type { ComponentDescriptor } from "./types.js";
import {
  catalogProperty as property,
  catalogTestIdProperty as testId
} from "./catalog-properties.js";

export const popoverDescriptor: ComponentDescriptor = {
  componentType: CoreComponentType.Popover,
  constraints: [{ kind: CatalogConstraintKind.ChildCount, maximum: 32, minimum: 1 }],
  properties: [
    property("disabled", CatalogPropertyType.Boolean, false),
    property("label", CatalogPropertyType.String, undefined, true),
    property("panelLabel", CatalogPropertyType.String, undefined, true),
    {
      ...property("placement", CatalogPropertyType.Enum, TooltipPlacement.Bottom),
      enumValues: Object.values(TooltipPlacement)
    },
    testId
  ],
  tagName: CoreElementTag.Popover,
  version: "1.0.0"
};
