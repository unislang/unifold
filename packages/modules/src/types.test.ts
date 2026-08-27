import { expect, it } from "vitest";

import {
  UiModuleDiagnosticCode,
  UiModuleResourceKind,
  UiModuleSchemaUri,
  UiModuleSchemaVersion
} from "./types.js";

it("pins the module contract and closed public vocabularies", () => {
  expect(UiModuleSchemaUri.Version1).toContain("ui-module/1.0");
  expect(UiModuleSchemaVersion.Version1).toBe("1.0.0");
  expect(Object.values(UiModuleResourceKind)).toHaveLength(8);
  expect(UiModuleResourceKind.Layout).toBe("layout");
  expect(UiModuleDiagnosticCode.ImportIntegrityMismatch).toBe("import-integrity-mismatch");
});
