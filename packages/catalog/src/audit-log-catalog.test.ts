import { CoreComponentType } from "@unislang/unifold-contracts";
import { expect, it } from "vitest";

import { auditLogDescriptor } from "./audit-log-catalog.js";
import { CatalogPropertyType, CoreElementTag } from "./enums.js";

it("declares the bounded read-only AuditLog contract", () => {
  expect(auditLogDescriptor).toMatchObject({
    componentType: CoreComponentType.AuditLog,
    tagName: CoreElementTag.AuditLog
  });
  expect(auditLogDescriptor.properties).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ name: "label", required: true }),
      expect.objectContaining({
        name: "entries",
        required: true,
        valueType: CatalogPropertyType.AuditLogEntryList
      }),
      expect.objectContaining({ defaultValue: 88, name: "itemHeight" }),
      expect.objectContaining({ defaultValue: 480, name: "viewportHeight" })
    ])
  );
});
