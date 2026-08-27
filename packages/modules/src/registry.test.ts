import { expect, it } from "vitest";

import { createUiModuleRegistry, uiModuleKey } from "./registry.js";
import { moduleFixture } from "./test-fixtures.test-data.js";
import { UiModuleDiagnosticCode, UiModuleRegistryStatus } from "./types.js";

it("registers strict modules by exact ID and version with deterministic integrity", async () => {
  const result = await createUiModuleRegistry([
    { module: moduleFixture(), sourceId: "@app/root.module.json" }
  ]);
  expect(result.status).toBe(UiModuleRegistryStatus.Ready);
  if (result.status !== UiModuleRegistryStatus.Ready) return;
  const registered = result.registry.modules.get(uiModuleKey("org.example.root", "1.0.0"));
  expect(registered).toMatchObject({
    integrity: expect.stringMatching(/^sha256-/u),
    sourceId: "@app/root.module.json"
  });
});

it("rejects local export and namespace collisions", async () => {
  const module = moduleFixture({
    imports: [importFixture("shared"), importFixture("shared")]
  });
  const result = await createUiModuleRegistry([{ module, sourceId: "root-a" }]);
  expect(result.status).toBe(UiModuleRegistryStatus.Rejected);
  expect(result.diagnostics[0]?.code).toBe(UiModuleDiagnosticCode.DuplicateNamespace);
});

it("rejects duplicate exact module registrations", async () => {
  const result = await createUiModuleRegistry([
    { module: moduleFixture(), sourceId: "root-a" },
    { module: moduleFixture(), sourceId: "root-b" }
  ]);
  expect(result.diagnostics[0]?.code).toBe(UiModuleDiagnosticCode.DuplicateModule);
});

it("rejects unsafe input before schema validation", async () => {
  const result = await createUiModuleRegistry([
    { module: { ...moduleFixture(), value: Number.POSITIVE_INFINITY }, sourceId: "unsafe" }
  ]);
  expect(result.diagnostics[0]?.code).toBe(UiModuleDiagnosticCode.UnsafeValue);
});

function importFixture(namespace: string) {
  return {
    integrity: "sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    moduleId: "org.example.shared",
    namespace,
    version: "1.0.0"
  };
}
