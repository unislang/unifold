import { CoreComponentType, UiUpdateTrigger } from "@unislang/unifold-contracts";
import { expect, it } from "vitest";

import { CatalogConstraintKind, CatalogPropertyType, CoreElementTag } from "./enums.js";
import { switchDescriptor } from "./switch-catalog.js";

it("defines one required-label boolean switch contract", () => {
  expect(switchDescriptor).toMatchObject({
    componentType: CoreComponentType.Switch,
    tagName: CoreElementTag.Switch
  });
  expect(switchDescriptor.constraints).toEqual([
    { kind: CatalogConstraintKind.ChildCount, maximum: 0, minimum: 0 }
  ]);
  expect(switchDescriptor.properties).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        minimumLength: 1,
        name: "label",
        required: true,
        valueType: CatalogPropertyType.String
      }),
      expect.objectContaining({ defaultValue: false, name: "value" }),
      expect.objectContaining({ defaultValue: UiUpdateTrigger.Input, name: "updateOn" })
    ])
  );
});
