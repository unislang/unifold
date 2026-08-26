import { CoreComponentType } from "@unislang/unifold-contracts";
import { expect, it } from "vitest";

import { CatalogConstraintKind, CatalogPropertyType, CoreElementTag } from "./enums.js";
import { tableDescriptor } from "./table-catalog.js";

it("defines the required bounded native-table contract", () => {
  expect(tableDescriptor).toMatchObject({
    componentType: CoreComponentType.Table,
    constraints: [{ kind: CatalogConstraintKind.TableData }],
    tagName: CoreElementTag.Table
  });
  expect(
    tableDescriptor.properties.map(({ name, required, valueType }) => ({
      name,
      required,
      valueType
    }))
  ).toEqual(
    expect.arrayContaining([
      { name: "columns", required: true, valueType: CatalogPropertyType.TableColumnList },
      { name: "rows", required: true, valueType: CatalogPropertyType.TableRowList }
    ])
  );
});
