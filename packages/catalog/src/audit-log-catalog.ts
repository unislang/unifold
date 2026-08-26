import { CoreComponentType } from "@unislang/unifold-contracts";

import { CatalogConstraintKind, CatalogPropertyType, CoreElementTag } from "./enums.js";
import type { ComponentDescriptor } from "./types.js";
import {
  catalogProperty as property,
  catalogTestIdProperty as testId
} from "./catalog-properties.js";

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
    testId
  ],
  tagName: CoreElementTag.AuditLog,
  version: "1.0.0"
};
