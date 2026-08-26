import { CoreComponentType, UiUpdateTrigger } from "@unislang/unifold-contracts";

import {
  CatalogConstraintKind,
  CatalogPropertyType,
  CoreElementTag,
  DataGridSelectionMode
} from "./enums.js";
import type { ComponentDescriptor } from "./types.js";
import {
  catalogEnumProperty as enumProperty,
  catalogProperty as property,
  catalogTestIdProperty as testId
} from "./catalog-properties.js";

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
    testId
  ],
  tagName: CoreElementTag.DataGrid,
  version: "1.0.0"
};
