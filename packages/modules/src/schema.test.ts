import { readFile } from "node:fs/promises";

import { expect, it } from "vitest";

import { moduleFixture } from "./test-fixtures.test-data.js";
import { validateUiModule } from "./schema.js";
import { UiModuleResourceKind, UiModuleSchemaUri, UiModuleSchemaVersion } from "./types.js";

it("keeps the JSON Schema and enum-backed module contract aligned", async () => {
  const schema = JSON.parse(
    await readFile(new URL("./ui-module.schema.json", import.meta.url), "utf8")
  ) as Record<string, unknown>;
  const text = JSON.stringify(schema);
  expect(text).toContain(UiModuleSchemaUri.Version1);
  expect(text).toContain(UiModuleSchemaVersion.Version1);
  Object.values(UiModuleResourceKind).forEach((kind) =>
    expect(text).toContain(JSON.stringify(kind))
  );
  expect(validateUiModule(moduleFixture()).module).toBeDefined();
});

it.each([
  ["runtime URL", { sourceUrl: "https://untrusted.example/module.json" }],
  ["unsafe key", { constructor: "unsafe" }],
  ["unknown contract", { schemaVersion: "2.0.0" }]
])("rejects an undeclared %s", (_label, extra) => {
  const candidate = { ...moduleFixture(), ...extra };
  expect(validateUiModule(candidate, "fixture").diagnostics.length).toBeGreaterThan(0);
});
