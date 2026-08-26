import { CoreComponentType, UiUpdateTrigger, type JsonValue } from "@unislang/unifold-contracts";

import { CatalogConstraintKind, CatalogPropertyType, CoreElementTag } from "./enums.js";
import type {
  CatalogConstraintDescriptor,
  CatalogPropertyDescriptor,
  ComponentDescriptor
} from "./types.js";
import {
  catalogEnumProperty as enumProperty,
  catalogProperty as property,
  catalogTestIdProperty as testId
} from "./catalog-properties.js";

export const choiceConstraints: readonly CatalogConstraintDescriptor[] = [
  {
    kind: CatalogConstraintKind.UniqueOptionValues,
    optionsProperty: "options"
  },
  {
    allowEmptySelection: true,
    kind: CatalogConstraintKind.SelectionInOptions,
    optionsProperty: "options",
    selectionProperty: "value"
  }
];

export function choiceProperties(
  valueType: CatalogPropertyType.String | CatalogPropertyType.StringArray,
  defaultValue: JsonValue
): readonly CatalogPropertyDescriptor[] {
  return [
    property("disabled", CatalogPropertyType.Boolean, false),
    property("errorMessage", CatalogPropertyType.String, ""),
    property("label", CatalogPropertyType.String, ""),
    property("name", CatalogPropertyType.String, ""),
    property("options", CatalogPropertyType.OptionList, []),
    property("required", CatalogPropertyType.Boolean, false),
    enumProperty("updateOn", UiUpdateTrigger.Input, Object.values(UiUpdateTrigger)),
    property("value", valueType, defaultValue),
    property("validators", CatalogPropertyType.StringArray, []),
    property("asyncValidators", CatalogPropertyType.StringArray, []),
    testId
  ];
}

export const comboboxDescriptor: ComponentDescriptor = {
  componentType: CoreComponentType.Combobox,
  constraints: choiceConstraints,
  properties: [
    ...choiceProperties(CatalogPropertyType.String, ""),
    property("noResultsMessage", CatalogPropertyType.String, "No matching options"),
    property("placeholder", CatalogPropertyType.String, "")
  ],
  tagName: CoreElementTag.Combobox,
  version: "1.0.0"
};
