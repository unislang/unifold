import { expect, it } from "vitest";

import { CatalogBindingKind, CatalogPropertyType } from "./enums.js";
import {
  catalogEnumProperty,
  catalogProperty,
  catalogTestIdProperty
} from "./catalog-properties.js";

it("creates property and test-selector descriptors through one shared boundary", () => {
  expect(catalogProperty("label", CatalogPropertyType.String, undefined, true)).toEqual({
    bindingKind: CatalogBindingKind.Property,
    bindingName: "label",
    name: "label",
    required: true,
    valueType: CatalogPropertyType.String
  });
  expect(catalogProperty("disabled", CatalogPropertyType.Boolean, false)).toMatchObject({
    defaultValue: false,
    required: false
  });
  expect(catalogEnumProperty("placement", "top", ["bottom", "top"])).toMatchObject({
    defaultValue: "top",
    enumValues: ["bottom", "top"],
    valueType: CatalogPropertyType.Enum
  });
  expect(catalogTestIdProperty).toMatchObject({
    bindingKind: CatalogBindingKind.Attribute,
    bindingName: "data-testid",
    name: "testId"
  });
});
