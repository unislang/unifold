import { CoreComponentType } from "@unislang/unifold-contracts";

import { CatalogConstraintKind, CatalogPropertyType, CoreElementTag } from "./enums.js";
import type { ComponentDescriptor } from "./types.js";
import {
  catalogProperty as property,
  catalogTestIdProperty as testId
} from "./catalog-properties.js";

export const MAXIMUM_MENU_ITEMS = 100;

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
    testId
  ],
  tagName: CoreElementTag.MenuButton,
  version: "1.0.0"
};
