import { CoreComponentType, UiUpdateTrigger } from "@unislang/unifold-contracts";
import { expect, it } from "vitest";

import { dataGridDescriptor } from "./data-grid-catalog.js";
import {
  CatalogConstraintKind,
  CatalogPropertyType,
  CoreElementTag,
  DataGridSelectionMode
} from "./enums.js";

it("defines the controlled native DataGrid contract", () => {
  expect(dataGridDescriptor).toMatchObject({
    componentType: CoreComponentType.DataGrid,
    constraints: [
      { kind: CatalogConstraintKind.TableData },
      { kind: CatalogConstraintKind.DataGridState }
    ],
    tagName: CoreElementTag.DataGrid
  });
  expect(dataGridDescriptor.properties).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: "columns",
        required: true,
        valueType: CatalogPropertyType.TableColumnList
      }),
      expect.objectContaining({
        defaultValue: DataGridSelectionMode.None,
        enumValues: Object.values(DataGridSelectionMode),
        name: "selectionMode"
      }),
      expect.objectContaining({
        defaultValue: { selectedRowIds: [] },
        name: "value",
        valueType: CatalogPropertyType.DataGridValue
      }),
      expect.objectContaining({ defaultValue: UiUpdateTrigger.Input, name: "updateOn" })
    ])
  );
});
