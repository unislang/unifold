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
    testId
  ],
  tagName: CoreElementTag.Tooltip,
  version: "1.0.0"
};
