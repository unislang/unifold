import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, expect, it } from "vitest";

import { UnifoldCliDiagnosticCode, UnifoldCliModuleProjectSchemaVersion } from "./enums.js";
import { writeModuleProject } from "./module-project.test-data.js";
import { UI_MODULE_PROJECT_SCHEMA, resolveUiModuleProject } from "./module-project.js";

let root = "";

beforeEach(async () => {
  root = join(tmpdir(), `unifold-module-project-${crypto.randomUUID()}`);
  await mkdir(root);
});

afterEach(async () => {
  await rm(root, { force: true, recursive: true });
});

it("resolves pinned sources and compiles a Scratch-style module document", async () => {
  await writeModuleProject(root);
  const result = await resolveUiModuleProject("modules.project.json", root);
  expect(result).toHaveProperty("project");
  if (!("project" in result)) return;
  expect(result.project.artifact.composedDocument["view"]).toMatchObject({
    $comp: "Text",
    content: "Scratch-style module page",
    id: "welcome"
  });
  expect(result.project.artifact.resources["shared/message/welcome"]).toMatchObject({
    value: "Welcome from a module"
  });
  expect(result.project.irIntegrity).toMatch(/^sha256-/u);
});

it("rejects integrity drift with source provenance", async () => {
  await writeModuleProject(root, true);
  const result = await resolveUiModuleProject("modules.project.json", root);
  expect(result).toMatchObject({
    diagnostics: [
      {
        code: UnifoldCliDiagnosticCode.ModuleInvalid,
        sourceCode: "import-integrity-mismatch",
        sourceId: "modules/application.module.json"
      }
    ]
  });
});

it("rejects malformed manifests and source traversal", async () => {
  await writeFile(join(root, "invalid.project.json"), "{}");
  const malformed = await resolveUiModuleProject("invalid.project.json", root);
  expect(malformed).toMatchObject({
    diagnostics: [{ code: UnifoldCliDiagnosticCode.ModuleManifestInvalid }]
  });
  const traversal = await resolveUiModuleProject("../outside.project.json", root);
  expect(traversal).toMatchObject({
    diagnostics: [{ code: UnifoldCliDiagnosticCode.ModuleManifestInvalid }]
  });
});

it.each([
  ["invalid JSON", "{"],
  ["invalid entry", JSON.stringify(projectManifest({ entry: null }))],
  ["non-array sources", JSON.stringify(projectManifest({ sources: "module.json" }))],
  ["duplicate sources", JSON.stringify(projectManifest({ sources: ["a.json", "a.json"] }))],
  ["non-string source", JSON.stringify(projectManifest({ sources: [42] }))]
])("rejects %s", async (_name, content) => {
  await writeFile(join(root, "variant.project.json"), content);
  const result = await resolveUiModuleProject("variant.project.json", root);
  expect(result).toMatchObject({
    diagnostics: [{ code: UnifoldCliDiagnosticCode.ModuleManifestInvalid }]
  });
});

it("rejects a directory where a module source file is required", async () => {
  await mkdir(join(root, "modules"));
  await writeFile(
    join(root, "directory.project.json"),
    JSON.stringify(projectManifest({ sources: ["modules"] }))
  );
  const result = await resolveUiModuleProject("directory.project.json", root);
  expect(result).toMatchObject({
    diagnostics: [{ code: UnifoldCliDiagnosticCode.ModuleManifestInvalid }]
  });
});

function projectManifest(overrides: Record<string, unknown>): Record<string, unknown> {
  return {
    $schema: UI_MODULE_PROJECT_SCHEMA,
    entry: {
      exportName: "application",
      moduleId: "org.example.application",
      version: "1.0.0"
    },
    schemaVersion: UnifoldCliModuleProjectSchemaVersion.Version1,
    sources: ["module.json"],
    ...overrides
  };
}
