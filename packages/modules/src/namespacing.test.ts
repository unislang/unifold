import { expect, it } from "vitest";

import { namespaceUiModuleContents } from "./namespacing.js";
import { moduleFixture, sharedModuleFixture } from "./test-fixtures.test-data.js";
import { UiModuleDiagnosticCode } from "./types.js";

it("namespaces definitions plus local and imported composition references", () => {
  const module = sharedModuleFixture();
  const contents = namespaceUiModuleContents(module, "shared", "shared.module.json");
  expect(contents.compositions[0]?.name).toBe("shared/profile-field");
  expect(contents.diagnostics).toEqual([]);

  const root = moduleFixture({
    imports: [importFixture("shared")]
  });
  const rewritten = namespaceUiModuleContents(root, "", "root.module.json").rewriteDocument({
    $compose: "shared/profile-field",
    $version: "1.0.0",
    id: "profile"
  });
  expect(rewritten["$compose"]).toBe("shared/profile-field");
});

it("rejects undeclared namespace references", () => {
  const contents = namespaceUiModuleContents(moduleFixture(), "", "root.module.json");
  contents.rewriteDocument({ $compose: "remote/profile-field", id: "profile" });
  expect(contents.diagnostics[0]?.code).toBe(UiModuleDiagnosticCode.InvalidNamespaceReference);
});

function importFixture(namespace: string) {
  return {
    integrity: "sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    moduleId: "org.example.shared",
    namespace,
    version: "1.0.0"
  };
}
