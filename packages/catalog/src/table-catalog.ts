import { CoreComponentType, type JsonValue } from "@unislang/unifold-contracts";

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
    {
      bindingKind: CatalogBindingKind.Attribute,
      bindingName: "data-testid",
      name: "testId",
      required: false,
      valueType: CatalogPropertyType.String
    }
  ],
  tagName: CoreElementTag.Table,
  version: "1.0.0"
};
