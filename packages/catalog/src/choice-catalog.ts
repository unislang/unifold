import { CoreComponentType, UiUpdateTrigger, type JsonValue } from "@unislang/unifold-contracts";

import {
  CatalogBindingKind,
  CatalogConstraintKind,
  CatalogPropertyType,
  CoreElementTag
} from "./enums.js";
import type {
  CatalogConstraintDescriptor,
  CatalogPropertyDescriptor,
  ComponentDescriptor
} from "./types.js";

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

const testId: CatalogPropertyDescriptor = {
  bindingKind: CatalogBindingKind.Attribute,
  bindingName: "data-testid",
  name: "testId",
  required: false,
  valueType: CatalogPropertyType.String
};

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

function property(
  name: string,
  valueType: CatalogPropertyType,
  defaultValue?: JsonValue
): CatalogPropertyDescriptor {
  const descriptor = {
    bindingKind: CatalogBindingKind.Property,
    bindingName: name,
    name,
    required: false,
    valueType
  };
  return defaultValue === undefined ? descriptor : { ...descriptor, defaultValue };
}

function enumProperty(
  name: string,
  defaultValue: string,
  values: readonly string[]
): CatalogPropertyDescriptor {
  return { ...property(name, CatalogPropertyType.Enum, defaultValue), enumValues: values };
}
