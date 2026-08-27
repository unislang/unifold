import { readFile } from "node:fs/promises";

import { expect, it } from "vitest";

import { UnifoldCliDiagnosticCode, UnifoldCliModuleProjectSchemaVersion } from "./enums.js";
import {
  UI_MODULE_PROJECT_SCHEMA,
  validateUiModuleProjectManifest,
  type UiModuleProjectManifest
} from "./module-project-schema.js";

it("keeps the exported project schema and enum-backed contract aligned", async () => {
  const schema = await jsonFile("./ui-module-project.schema.json");
  const packageJson = await jsonFile("../package.json");
  expect(schema["$id"]).toBe(UI_MODULE_PROJECT_SCHEMA);
  expect(JSON.stringify(schema)).toContain(UnifoldCliModuleProjectSchemaVersion.Version1);
  expect(packageJson["exports"]).toMatchObject({
    "./schemas/ui-module-project.schema.json": "./dist/ui-module-project.schema.json"
  });
  expect(validateUiModuleProjectManifest(projectManifest()).manifest).toBeDefined();
});

it.each([
  ["unknown property", { ...projectManifest(), runtimeUrl: "https://example.invalid" }],
  ["duplicate source", { ...projectManifest(), sources: ["module.json", "module.json"] }],
  ["traversal source", { ...projectManifest(), sources: ["../module.json"] }],
  ["unpinned entry", { ...projectManifest(), entry: { ...projectManifest().entry, version: "1" } }]
])("rejects a project with an %s", (_label, value) => {
  expect(validateUiModuleProjectManifest(value)).toMatchObject({
    diagnostics: expect.arrayContaining([
      expect.objectContaining({ code: UnifoldCliDiagnosticCode.ModuleManifestInvalid })
    ])
  });
});

function projectManifest(): UiModuleProjectManifest {
  return {
    $schema: UI_MODULE_PROJECT_SCHEMA,
    entry: {
      exportName: "application",
      moduleId: "org.example.application",
      version: "1.0.0"
    },
    schemaVersion: UnifoldCliModuleProjectSchemaVersion.Version1,
    sources: ["modules/application.module.json"]
  };
}

async function jsonFile(path: string): Promise<Record<string, unknown>> {
  return JSON.parse(await readFile(new URL(path, import.meta.url), "utf8")) as Record<
    string,
    unknown
  >;
}
