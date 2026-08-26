import { CoreComponentType } from "@unislang/unifold-contracts";

import { CatalogConstraintKind, CatalogPropertyType, CoreElementTag } from "./enums.js";
import type { ComponentDescriptor } from "./types.js";
import {
  catalogProperty as property,
  catalogTestIdProperty as testId
} from "./catalog-properties.js";

export const tableDescriptor: ComponentDescriptor = {
  componentType: CoreComponentType.Table,
  constraints: [
    {
      columnsProperty: "columns",
      kind: CatalogConstraintKind.TableData,
      rowsProperty: "rows"
    }
  ],
  properties: [
    property("caption", CatalogPropertyType.String, undefined, true),
    property("columns", CatalogPropertyType.TableColumnList, undefined, true),
    property("rows", CatalogPropertyType.TableRowList, undefined, true),
    property("emptyMessage", CatalogPropertyType.String, "No data"),
    testId
  ],
  tagName: CoreElementTag.Table,
  version: "1.0.0"
};
