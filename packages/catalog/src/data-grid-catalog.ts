import { CoreComponentType, UiUpdateTrigger, type JsonValue } from "@unislang/unifold-contracts";

import {
  CatalogBindingKind,
  CatalogConstraintKind,
  CatalogPropertyType,
  CoreElementTag,
  DataGridSelectionMode
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

export const dataGridDescriptor: ComponentDescriptor = {
  componentType: CoreComponentType.DataGrid,
  constraints: [
    {
      columnsProperty: "columns",
      kind: CatalogConstraintKind.TableData,
      rowsProperty: "rows"
    },
    {
      columnsProperty: "columns",
      kind: CatalogConstraintKind.DataGridState,
      rowsProperty: "rows",
      selectionModeProperty: "selectionMode",
      sortableColumnsProperty: "sortableColumns",
      valueProperty: "value"
    }
  ],
  properties: [
    property("caption", CatalogPropertyType.String, undefined, true),
    property("columns", CatalogPropertyType.TableColumnList, undefined, true),
    property("rows", CatalogPropertyType.TableRowList, undefined, true),
    property("sortableColumns", CatalogPropertyType.StringArray, []),
    enumProperty("selectionMode", DataGridSelectionMode.None, Object.values(DataGridSelectionMode)),
    property("value", CatalogPropertyType.DataGridValue, { selectedRowIds: [] }),
    property("disabled", CatalogPropertyType.Boolean, false),
    property("errorMessage", CatalogPropertyType.String, ""),
    property("name", CatalogPropertyType.String, ""),
    enumProperty("updateOn", UiUpdateTrigger.Input, Object.values(UiUpdateTrigger)),
    property("validators", CatalogPropertyType.StringArray, []),
    property("asyncValidators", CatalogPropertyType.StringArray, []),
    property("emptyMessage", CatalogPropertyType.String, "No data"),
    {
      bindingKind: CatalogBindingKind.Attribute,
      bindingName: "data-testid",
      name: "testId",
      required: false,
      valueType: CatalogPropertyType.String
    }
  ],
  tagName: CoreElementTag.DataGrid,
  version: "1.0.0"
};
