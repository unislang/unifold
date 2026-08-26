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

export const masterDetailDescriptor: ComponentDescriptor = {
  componentType: CoreComponentType.MasterDetail,
  constraints: [
    {
      columnsProperty: "columns",
      kind: CatalogConstraintKind.TableData,
      rowsProperty: "rows"
    },
    {
      columnsProperty: "columns",
      kind: CatalogConstraintKind.MasterDetailState,
      masterColumnProperty: "masterColumn",
      rowsProperty: "rows",
      valueProperty: "value"
    }
  ],
  properties: [
    property("label", CatalogPropertyType.String, undefined, true),
    property("columns", CatalogPropertyType.TableColumnList, undefined, true),
    property("rows", CatalogPropertyType.TableRowList, undefined, true),
    property("masterColumn", CatalogPropertyType.String, undefined, true),
    property("value", CatalogPropertyType.String, ""),
    property("detailLabel", CatalogPropertyType.String, "Details"),
    property("emptyMessage", CatalogPropertyType.String, "No records"),
    property("noSelectionMessage", CatalogPropertyType.String, "Select a record to view details"),
    property("disabled", CatalogPropertyType.Boolean, false),
    property("errorMessage", CatalogPropertyType.String, ""),
    property("name", CatalogPropertyType.String, ""),
    enumProperty("updateOn", UiUpdateTrigger.Input, Object.values(UiUpdateTrigger)),
    property("validators", CatalogPropertyType.StringArray, []),
    property("asyncValidators", CatalogPropertyType.StringArray, []),
    property("itemHeight", CatalogPropertyType.PositiveInteger, 40),
    property("overscan", CatalogPropertyType.PositiveInteger, 4),
    property("viewportHeight", CatalogPropertyType.PositiveInteger, 400),
    {
      bindingKind: CatalogBindingKind.Attribute,
      bindingName: "data-testid",
      name: "testId",
      required: false,
      valueType: CatalogPropertyType.String
    }
  ],
  tagName: CoreElementTag.MasterDetail,
  version: "1.0.0"
};
