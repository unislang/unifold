import { CoreComponentType, type JsonValue } from "@unislang/unifold-contracts";

import {
  CatalogBindingKind,
  CatalogConstraintKind,
  CatalogPropertyType,
  CoreElementTag
} from "./enums.js";
import type { CatalogPropertyDescriptor, ComponentDescriptor } from "./types.js";

function property(
  name: string,
  valueType: CatalogPropertyType,
  defaultValue?: JsonValue,
  required = false
): CatalogPropertyDescriptor {
  const descriptor = {
    bindingKind: CatalogBindingKind.Property,
    bindingName: name,
    name,
    required,
    valueType
  };
  return defaultValue === undefined ? descriptor : { ...descriptor, defaultValue };
}

export const auditLogDescriptor: ComponentDescriptor = {
  componentType: CoreComponentType.AuditLog,
  constraints: [{ entriesProperty: "entries", kind: CatalogConstraintKind.AuditLogData }],
  properties: [
    property("label", CatalogPropertyType.String, undefined, true),
    property("entries", CatalogPropertyType.AuditLogEntryList, undefined, true),
    property("emptyMessage", CatalogPropertyType.String, "No audit events"),
    property("itemHeight", CatalogPropertyType.PositiveInteger, 88),
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
  tagName: CoreElementTag.AuditLog,
  version: "1.0.0"
};
