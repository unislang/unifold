import { CoreComponentType, UiUpdateTrigger } from "@unislang/unifold-contracts";
import { expect, it } from "vitest";

import { choiceConstraints, choiceProperties, comboboxDescriptor } from "./choice-catalog.js";
import { CatalogConstraintKind, CatalogPropertyType, CoreElementTag } from "./enums.js";

it("defines the shared bounded choice contract and editable combobox additions", () => {
  expect(choiceConstraints.map(({ kind }) => kind)).toEqual([
    CatalogConstraintKind.UniqueOptionValues,
    CatalogConstraintKind.SelectionInOptions
  ]);
  expect(choiceProperties(CatalogPropertyType.String, "")).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ name: "options", valueType: CatalogPropertyType.OptionList }),
      expect.objectContaining({ defaultValue: UiUpdateTrigger.Input, name: "updateOn" })
    ])
  );
  expect(comboboxDescriptor).toMatchObject({
    componentType: CoreComponentType.Combobox,
    tagName: CoreElementTag.Combobox
  });
  expect(comboboxDescriptor.properties).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ name: "noResultsMessage", valueType: CatalogPropertyType.String }),
      expect.objectContaining({ name: "placeholder", valueType: CatalogPropertyType.String })
    ])
  );
});
