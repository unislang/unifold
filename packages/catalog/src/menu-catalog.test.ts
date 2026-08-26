import { CoreComponentType } from "@unislang/unifold-contracts";
import { expect, it } from "vitest";

import { CatalogConstraintKind, CatalogPropertyType, CoreElementTag } from "./enums.js";
import { menuButtonDescriptor } from "./menu-catalog.js";

it("defines a bounded unique-item MenuButton contract", () => {
  expect(menuButtonDescriptor).toMatchObject({
    componentType: CoreComponentType.MenuButton,
    tagName: CoreElementTag.MenuButton
  });
  expect(menuButtonDescriptor.constraints).toEqual([
    { kind: CatalogConstraintKind.UniqueOptionValues, optionsProperty: "items" }
  ]);
  expect(menuButtonDescriptor.properties.find(({ name }) => name === "items")).toMatchObject({
    required: true,
    valueType: CatalogPropertyType.MenuItemList
  });
});
