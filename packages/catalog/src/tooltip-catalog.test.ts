import { CoreComponentType } from "@unislang/unifold-contracts";
import { expect, it } from "vitest";

import {
  CatalogConstraintKind,
  CatalogPropertyType,
  CoreElementTag,
  TooltipPlacement
} from "./enums.js";
import { tooltipDescriptor } from "./tooltip-catalog.js";

it("defines an exact leaf Tooltip contract", () => {
  expect(tooltipDescriptor).toMatchObject({
    componentType: CoreComponentType.Tooltip,
    constraints: [{ kind: CatalogConstraintKind.ChildCount, maximum: 0, minimum: 0 }],
    tagName: CoreElementTag.Tooltip
  });
  expect(tooltipDescriptor.properties.find(({ name }) => name === "content")).toMatchObject({
    required: true,
    valueType: CatalogPropertyType.String
  });
  expect(tooltipDescriptor.properties.find(({ name }) => name === "placement")).toMatchObject({
    defaultValue: TooltipPlacement.Top,
    enumValues: Object.values(TooltipPlacement)
  });
});
