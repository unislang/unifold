import { UiCollectionBehaviorVersion } from "@unislang/unifold-contracts";
import { compileUiDocument, UnifoldIrVersion } from "@unislang/unifold-ir";
import { createTrustedLayoutDefinitionRegistry } from "@unislang/unifold-compositions";
import { expect, it } from "vitest";

import { uiModuleIntegrity } from "./integrity.js";
import { createUiModuleRegistry } from "./registry.js";
import { resolveUiModule } from "./resolver.js";
import {
  composedDocumentFixture,
  collectionLayoutDocumentFixture,
  layoutDefinitionFixture,
  layoutDocumentFixture,
  layoutModuleFixture,
  moduleFixture,
  sharedModuleFixture
} from "./test-fixtures.test-data.js";
import {
  UiModuleDiagnosticCode,
  UiModuleResourceKind,
  UiModuleRegistryStatus,
  UiModuleResolutionStatus,
  type UiResolvedModuleArtifact
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

it("flattens a Scratch-style layout export before composition expansion", async () => {
  const root = moduleFixture({
    exports: {
      ...moduleFixture().exports,
      documents: [{ document: layoutDocumentFixture(), name: "application" }]
    }
  });
  const registry = await createUiModuleRegistry([{ module: root, sourceId: "layout.module.json" }]);
  if (registry.status !== UiModuleRegistryStatus.Ready) return;
  const result = await resolveUiModule(registry.registry, request());
  expect(result.status).toBe(UiModuleResolutionStatus.Resolved);
  if (result.status !== UiModuleResolutionStatus.Resolved) return;
  expect(result.artifact.composedDocument["view"]).toMatchObject({
    $comp: "Text",
    content: "Scratch-style module application",
    id: "message"
  });
  expect(compileUiDocument(result.artifact.document).diagnostics).toEqual([]);
});

it("preserves executable collection behavior through a module artifact", async () => {
  const root = moduleFixture({
    exports: {
      ...moduleFixture().exports,
      documents: [{ document: collectionLayoutDocumentFixture(), name: "application" }]
    }
  });
  const registry = await createUiModuleRegistry([{ module: root, sourceId: "collection.json" }]);
  if (registry.status !== UiModuleRegistryStatus.Ready) return;
  const result = await resolveUiModule(registry.registry, request());
  expect(result.status).toBe(UiModuleResolutionStatus.Resolved);
  if (result.status !== UiModuleResolutionStatus.Resolved) return;
  expect(result.artifact.composedDocument["collectionBehaviors"]).toEqual({
    contractVersion: UiCollectionBehaviorVersion.Version1,
    nodes: [{ collectionId: "items", emptyFocusTargetId: "add-item" }]
  });
  const compiled = compileUiDocument(result.artifact.document);
  expect(compiled.diagnostics).toEqual([]);
  expect(compiled.document).toMatchObject({
    collectionBehaviorsById: { items: { emptyFocusTargetId: "add-item" } },
    irVersion: UnifoldIrVersion.Version1_1
  });
});

it("resolves a Scratch-style export through a trusted external layout registry", async () => {
  const source = layoutDocumentFixture();
  const { layouts, ...document } = source;
  const root = moduleFixture({
    exports: {
      ...moduleFixture().exports,
      documents: [{ document, name: "application" }]
    }
  });
  const registry = await createUiModuleRegistry([{ module: root, sourceId: "layout.module.json" }]);
  if (registry.status !== UiModuleRegistryStatus.Ready) return;

  const rejected = await resolveUiModule(registry.registry, request());
  expect(rejected.status).toBe(UiModuleResolutionStatus.Rejected);
  const result = await resolveUiModule(registry.registry, {
    ...request(),
    layoutRegistry: createTrustedLayoutDefinitionRegistry(layouts)
  });
  expect(result.status).toBe(UiModuleResolutionStatus.Resolved);
});

it("resolves an exact imported module layout and composes its host registry", async () => {
  const layouts = layoutModuleFixture();
  const root = await importedLayoutRoot(layouts, "shared/layout/profile-page");
  const registry = await createUiModuleRegistry([
    { module: root, sourceId: "root.module.json" },
    { module: layouts, sourceId: "layouts.module.json" }
  ]);
  if (registry.status !== UiModuleRegistryStatus.Ready) return;
  const result = await resolveUiModule(registry.registry, {
    ...request(),
    layoutRegistry: createTrustedLayoutDefinitionRegistry([
      layoutDefinitionFixture("host-page", "Host layout")
    ])
  });
  expect(result.status).toBe(UiModuleResolutionStatus.Resolved);
  if (result.status !== UiModuleResolutionStatus.Resolved) return;
  expect(result.artifact.document["view"]).toMatchObject({
    $comp: "Text",
    content: "Scratch-style module application",
    id: "message"
  });
  expect(result.artifact.resources["shared/layout/profile-page"]).toMatchObject({
    value: { layoutType: "shared/layout/profile-page", version: "1.0.0" }
  });
  expect(result.artifact.sourceMap["/view"]).toMatchObject({
    moduleId: "org.example.layouts",
    pointer: "/exports/resources/0/value/template",
    sourceId: "layouts.module.json"
  });
});

it("maps variable-supplied layout nodes to the exact root document value", async () => {
  const layouts = variableNodeLayoutModule();
  const root = await variableNodeLayoutRoot(layouts);
  const registry = await createUiModuleRegistry([
    { module: root, sourceId: "root.module.json" },
    { module: layouts, sourceId: "layouts.module.json" }
  ]);
  if (registry.status !== UiModuleRegistryStatus.Ready) return;
  const result = await resolveUiModule(registry.registry, request());
  if (result.status !== UiModuleResolutionStatus.Resolved) return;
  expect(result.artifact.sourceMap["/view/$children/0"]).toMatchObject({
    moduleId: "org.example.root",
    pointer: "/exports/documents/0/document/variables/fields/0",
    sourceId: "root.module.json"
  });
});

it("rejects an imported layout requested without its exact namespace", async () => {
  const layouts = layoutModuleFixture();
  const root = await importedLayoutRoot(layouts, "profile-page");
  const registry = await createUiModuleRegistry([
    { module: root, sourceId: "root.module.json" },
    { module: layouts, sourceId: "layouts.module.json" }
  ]);
  if (registry.status !== UiModuleRegistryStatus.Ready) return;
  const result = await resolveUiModule(registry.registry, request());
  expect(result.status).toBe(UiModuleResolutionStatus.Rejected);
  expect(result.diagnostics[0]?.code).toBe(UiModuleDiagnosticCode.CompositionInvalid);
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
  await expectArtifactIntegrity(result.artifact);
  const compiled = compileUiDocument(result.artifact.document);
  expect(compiled.diagnostics).toEqual([]);
  expect(compiled.document).toBeDefined();
}

async function expectArtifactIntegrity(artifact: UiResolvedModuleArtifact): Promise<void> {
  const { integrity, ...content } = artifact;
  expect(integrity).toBe(await uiModuleIntegrity(content));
  expect(integrity).not.toBe(await uiModuleIntegrity(artifact.document));
  const changed = {
    ...content,
    sourceMap: { ...content.sourceMap, "/changed": content.sourceMap["/view"] }
  };
  expect(await uiModuleIntegrity(changed)).not.toBe(integrity);
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

async function importedLayoutRoot(
  layouts: ReturnType<typeof layoutModuleFixture>,
  layoutType: string
) {
  const document = { ...layoutDocumentFixture(), layoutType };
  Reflect.deleteProperty(document, "layouts");
  return moduleFixture({
    exports: {
      ...moduleFixture().exports,
      documents: [{ document, name: "application" }]
    },
    imports: [await moduleImport(layouts, "shared")]
  });
}

function variableNodeLayoutModule() {
  return moduleFixture({
    exports: {
      compositions: [],
      documents: [],
      resources: [
        {
          id: "profile-form",
          kind: UiModuleResourceKind.Layout,
          value: {
            layoutType: "profile-form",
            template: { children: "{{fields}}", id: "root", type: "Composition" },
            variables: { fields: { required: true, type: "nodes" } },
            version: "1.0.0"
          }
        }
      ]
    },
    id: "org.example.layouts"
  });
}

async function variableNodeLayoutRoot(layouts: ReturnType<typeof variableNodeLayoutModule>) {
  const document = {
    ...layoutDocumentFixture(),
    layoutType: "shared/layout/profile-form",
    variables: {
      fields: [{ id: "field", props: { label: "Name", value: "" }, type: "TextField" }]
    }
  };
  Reflect.deleteProperty(document, "layouts");
  return moduleFixture({
    exports: {
      ...moduleFixture().exports,
      documents: [{ document, name: "application" }]
    },
    imports: [await moduleImport(layouts, "shared")]
  });
}
