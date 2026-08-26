import { CoreComponentType } from "@unislang/unifold-contracts";
import { expect, it } from "vitest";

import { CatalogConstraintKind, CoreElementTag, TooltipPlacement } from "./enums.js";
import { popoverDescriptor } from "./popover-catalog.js";

it("describes a bounded labeled Popover with finite placement", () => {
  expect(popoverDescriptor).toMatchObject({
    componentType: CoreComponentType.Popover,
    constraints: [{ kind: CatalogConstraintKind.ChildCount, maximum: 32, minimum: 1 }],
    tagName: CoreElementTag.Popover
  });
  expect(popoverDescriptor.properties.find(({ name }) => name === "label")?.required).toBe(true);
  expect(popoverDescriptor.properties.find(({ name }) => name === "panelLabel")?.required).toBe(
    true
  );
  expect(popoverDescriptor.properties.find(({ name }) => name === "placement")).toMatchObject({
    defaultValue: TooltipPlacement.Bottom,
    enumValues: Object.values(TooltipPlacement)
  });
});
