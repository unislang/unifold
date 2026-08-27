import { compileUiDocument } from "@unislang/unifold-ir";
import { expect, it } from "vitest";

import { uiModuleIntegrity } from "./integrity.js";
import { createUiModuleRegistry } from "./registry.js";
import { resolveUiModule } from "./resolver.js";
import {
  composedDocumentFixture,
  moduleFixture,
  sharedModuleFixture
} from "./test-fixtures.test-data.js";
import {
  UiModuleDiagnosticCode,
  UiModuleRegistryStatus,
  UiModuleResolutionStatus
} from "./types.js";

it("resolves pinned modules to one deterministic expanded document, source map, and IR", async () => {
  const shared = sharedModuleFixture();
  const root = moduleFixture({
    exports: {
      ...moduleFixture().exports,
      documents: [{ document: composedDocumentFixture(), name: "application" }]
    },
    imports: [await moduleImport(shared, "shared")]
  });
  const registry = await createUiModuleRegistry([
    { module: root, sourceId: "@app/root.module.json" },
    { module: shared, sourceId: "@app/shared.module.json" }
  ]);
  expect(registry.status).toBe(UiModuleRegistryStatus.Ready);
  if (registry.status !== UiModuleRegistryStatus.Ready) return;
  const first = await resolveUiModule(registry.registry, request());
  const second = await resolveUiModule(registry.registry, request());
  expect(first).toEqual(second);
  expect(first.status).toBe(UiModuleResolutionStatus.Resolved);
  if (first.status !== UiModuleResolutionStatus.Resolved) return;
  await expectResolvedArtifact(first);
});

it("rejects an unpinned import", async () => {
  const shared = sharedModuleFixture();
  const root = moduleFixture({ imports: [await moduleImport(shared, "shared", "invalid")] });
  const registry = await createUiModuleRegistry([
    { module: root, sourceId: "root" },
    { module: shared, sourceId: "shared" }
  ]);
  if (registry.status !== UiModuleRegistryStatus.Ready) return;
  const result = await resolveUiModule(registry.registry, request());
  expect(result.diagnostics[0]?.code).toBe(UiModuleDiagnosticCode.ImportIntegrityMismatch);
});

it("rejects an unknown document export", async () => {
  const registry = await createUiModuleRegistry([{ module: moduleFixture(), sourceId: "root" }]);
  if (registry.status !== UiModuleRegistryStatus.Ready) return;
  const missing = await resolveUiModule(registry.registry, {
    ...request(),
    exportName: "missing"
  });
  expect(missing.diagnostics[0]?.code).toBe(UiModuleDiagnosticCode.ExportNotFound);
});

async function expectResolvedArtifact(
  result: Extract<Awaited<ReturnType<typeof resolveUiModule>>, { artifact: unknown }>
): Promise<void> {
  expectResolvedView(result.artifact.document);
  expectResolvedSources(result.artifact);
  expect(result.artifact.integrity).toBe(await uiModuleIntegrity(result.artifact.document));
  const compiled = compileUiDocument(result.artifact.document);
  expect(compiled.diagnostics).toEqual([]);
  expect(compiled.document).toBeDefined();
}

function expectResolvedView(document: Record<string, unknown>): void {
  expect(document["view"]).toMatchObject({
    $children: [{ $comp: "TextField", id: "profile::name" }],
    $comp: "Composition",
    id: "profile"
  });
  expect(document["compositionManifest"]).toMatchObject({
    nodeProvenanceById: {
      profile: { localId: "root" },
      "profile::name": { localId: "name" }
    }
  });
}

function expectResolvedSources(
  artifact: Extract<Awaited<ReturnType<typeof resolveUiModule>>, { artifact: unknown }>["artifact"]
): void {
  expect(artifact.sourceMap["/compositions/0"]).toMatchObject({
    sourceId: "@app/shared.module.json"
  });
  expect(artifact.resources["shared/message/label"]).toMatchObject({ value: "Shared label" });
}

function request() {
  return { exportName: "application", moduleId: "org.example.root", version: "1.0.0" };
}

async function moduleImport(
  module: ReturnType<typeof sharedModuleFixture>,
  namespace: string,
  integrity?: string
) {
  return {
    integrity: integrity ?? (await uiModuleIntegrity(module)),
    moduleId: module.id,
    namespace,
    version: module.version
  };
}
