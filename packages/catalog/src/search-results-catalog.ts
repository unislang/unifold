import { CoreComponentType, UiUpdateTrigger, type JsonValue } from "@unislang/unifold-contracts";

import {
  CatalogBindingKind,
  CatalogConstraintKind,
  CatalogPropertyType,
  CoreElementTag
} from "./enums.js";
import type { CatalogPropertyDescriptor, ComponentDescriptor } from "./types.js";

const property = (
  name: string,
  valueType: CatalogPropertyType,
  defaultValue?: JsonValue,
  required = false
): CatalogPropertyDescriptor => {
  const descriptor = {
    bindingKind: CatalogBindingKind.Property,
    bindingName: name,
    name,
    required,
    valueType
  };
  return defaultValue === undefined ? descriptor : { ...descriptor, defaultValue };
};

const enumProperty = (
  name: string,
  defaultValue: string,
  enumValues: readonly string[]
): CatalogPropertyDescriptor => ({
  ...property(name, CatalogPropertyType.Enum, defaultValue),
  enumValues
});

export const searchResultsDescriptor: ComponentDescriptor = {
  componentType: CoreComponentType.SearchResults,
  constraints: [
    {
      kind: CatalogConstraintKind.SearchResultsState,
      resultsProperty: "results",
      valueProperty: "value"
    }
  ],
  properties: [
    property("label", CatalogPropertyType.String, undefined, true),
    property("results", CatalogPropertyType.SearchResultList, undefined, true),
    property("value", CatalogPropertyType.SearchResultsValue, {
      query: "",
      selectedResultId: ""
    }),
    property("resultsLabel", CatalogPropertyType.String, "Search results"),
    property("placeholder", CatalogPropertyType.String, ""),
    property("emptyMessage", CatalogPropertyType.String, "No results"),
    property("loading", CatalogPropertyType.Boolean, false),
    property("loadingMessage", CatalogPropertyType.String, "Loading results"),
    property("disabled", CatalogPropertyType.Boolean, false),
    property("errorMessage", CatalogPropertyType.String, ""),
    property("name", CatalogPropertyType.String, ""),
    enumProperty("updateOn", UiUpdateTrigger.Input, Object.values(UiUpdateTrigger)),
    property("validators", CatalogPropertyType.StringArray, []),
    property("asyncValidators", CatalogPropertyType.StringArray, []),
    property("itemHeight", CatalogPropertyType.PositiveInteger, 72),
    property("overscan", CatalogPropertyType.PositiveInteger, 4),
    property("viewportHeight", CatalogPropertyType.PositiveInteger, 480),
    {
      bindingKind: CatalogBindingKind.Attribute,
      bindingName: "data-testid",
      name: "testId",
      required: false,
      valueType: CatalogPropertyType.String
    }
  ],
  tagName: CoreElementTag.SearchResults,
  version: "1.0.0"
};
