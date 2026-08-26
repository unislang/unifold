import { CoreComponentType, UiUpdateTrigger } from "@unislang/unifold-contracts";
import { expect, it } from "vitest";

import {
  MAXIMUM_CHECKBOX_GROUP_OPTIONS,
  checkboxGroupDescriptor
} from "./checkbox-group-catalog.js";
import { CatalogConstraintKind, CatalogPropertyType, CoreElementTag } from "./enums.js";

it("defines one required-label repeated native choice contract", () => {
  expect(checkboxGroupDescriptor).toMatchObject({
    componentType: CoreComponentType.CheckboxGroup,
    tagName: CoreElementTag.CheckboxGroup
  });
  expect(checkboxGroupDescriptor.constraints?.map(({ kind }) => kind)).toEqual([
    CatalogConstraintKind.ChildCount,
    CatalogConstraintKind.UniqueOptionValues,
    CatalogConstraintKind.SelectionInOptions
  ]);
  expect(checkboxGroupDescriptor.properties).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ minimumLength: 1, name: "label", required: true }),
      expect.objectContaining({
        maximumItems: MAXIMUM_CHECKBOX_GROUP_OPTIONS,
        minimumItems: 1,
        name: "options",
        required: true,
        valueType: CatalogPropertyType.OptionList
      }),
      expect.objectContaining({
        defaultValue: UiUpdateTrigger.Input,
        name: "updateOn"
      }),
      expect.objectContaining({ defaultValue: [], name: "value" })
    ])
  );
});

it("disallows authored selections of disabled options", () => {
  expect(checkboxGroupDescriptor.constraints).toContainEqual(
    expect.objectContaining({
      allowDisabledSelection: false,
      kind: CatalogConstraintKind.SelectionInOptions
    })
  );
});
