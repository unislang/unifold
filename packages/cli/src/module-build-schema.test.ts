import { readFile } from "node:fs/promises";

import { UiModuleResourceKind } from "@unislang/unifold-modules";
import { expect, it } from "vitest";

import { UnifoldCliDiagnosticCode, UnifoldCliModuleBuildSchemaVersion } from "./enums.js";
import {
  UI_MODULE_BUILD_SCHEMA,
  validateUiModuleBuildArtifact,
  type UiModuleBuildArtifact
} from "./module-build-schema.js";

it("keeps the exported build schema and enum-backed contract aligned", async () => {
  const schema = await jsonFile("./ui-module-build.schema.json");
  const packageJson = await jsonFile("../package.json");
  const schemaText = JSON.stringify(schema);
  expect(schema["$id"]).toBe(UI_MODULE_BUILD_SCHEMA);
  expect(schemaText).toContain(UnifoldCliModuleBuildSchemaVersion.Version1);
  Object.values(UiModuleResourceKind).forEach((kind) => expect(schemaText).toContain(kind));
  expect(packageJson["exports"]).toMatchObject({
    "./schemas/ui-module-build.schema.json": "./dist/ui-module-build.schema.json"
  });
  expect(validateUiModuleBuildArtifact(buildArtifact()).artifact).toBeDefined();
});

it.each([
  ["unknown property", { ...buildArtifact(), sourceUrl: "https://example.invalid" }],
  ["invalid integrity", { ...buildArtifact(), integrity: "latest" }],
  ["unsafe document key", { ...buildArtifact(), document: { constructor: "unsafe" } }],
  ["unknown resource kind", buildWithResourceKind("other")]
])("rejects a build artifact with an %s", (_label, value) => {
  expect(validateUiModuleBuildArtifact(value)).toMatchObject({
    diagnostics: expect.arrayContaining([
      expect.objectContaining({ code: UnifoldCliDiagnosticCode.ModuleBuildInvalid })
    ])
  });
});

function buildArtifact(): UiModuleBuildArtifact {
  return {
    $schema: UI_MODULE_BUILD_SCHEMA,
    document: { id: "application" },
    entry: {
      exportName: "application",
      moduleId: "org.example.application",
      version: "1.0.0"
    },
    integrity: integrity("a"),
    irIntegrity: integrity("b"),
    resources: {},
    schemaVersion: UnifoldCliModuleBuildSchemaVersion.Version1,
    sourceMap: {}
  };
}

function buildWithResourceKind(kind: string): unknown {
  return {
    ...buildArtifact(),
    resources: { "message/welcome": { id: "message/welcome", kind, value: "Welcome" } }
  };
}

function integrity(character: string): string {
  return `sha256-${character.repeat(43)}`;
}

async function jsonFile(path: string): Promise<Record<string, unknown>> {
  return JSON.parse(await readFile(new URL(path, import.meta.url), "utf8")) as Record<
    string,
    unknown
  >;
}
