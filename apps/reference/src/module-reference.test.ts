// @vitest-environment happy-dom

import {
  UnifoldApplicationMountStatus,
  UnifoldApplicationUpdateStatus,
  UnifoldPreparationStatus,
  mountUnifoldApplication,
  prepareUnifoldDocument,
  type UnifoldApplicationPort
} from "@unislang/unifold";
import { UiCollectionOperationType } from "@unislang/unifold-contracts";
import {
  UiModuleRegistryStatus,
  UiModuleResolutionStatus,
  createUiModuleApplicationInput,
  createUiModuleLock,
  createUiModuleRegistry,
  resolveUiModule,
  uiModuleIntegrity,
  validateUiModuleLock,
  type UiResolvedModuleArtifact
} from "@unislang/unifold-modules";
import { expect, it } from "vitest";

import {
  resolveProductionReferenceArtifact,
  resolveReferenceModuleArtifact
} from "./module-reference.js";

it("resolves the fixed Scratch-style reference modules with runtime and lock parity", async () => {
  const first = await resolveReferenceModuleArtifact();
  const second = await resolveReferenceModuleArtifact();
  expect(first).toEqual(second);
  expectReferenceView(first.composedDocument["view"]);
  expect(first.resources["shared/message/profile-heading"]).toMatchObject({
    value: "Module-authored profile"
  });
  const preparation = prepareUnifoldDocument(first.composedDocument);
  expect(preparation.status).toBe(UnifoldPreparationStatus.Valid);
  const irIntegrity = await uiModuleIntegrity(requirePrepared(preparation).document);
  const lock = createUiModuleLock(first, entry(), irIntegrity);
  expect(validateUiModuleLock(lock)).toMatchObject({ diagnostics: [], lock });
  expect(lock.modules).toHaveLength(2);
  expect(first.sourceMap["/view"]).toMatchObject({
    sourceId: "src/modules/scratch.module.json"
  });
});

it("compiles the complete production reference document through UiModule", async () => {
  const artifact = await resolveProductionReferenceArtifact();
  expect(artifact.composedDocument).toMatchObject({
    id: "profile-reference",
    view: { $compose: "profile/ProfileEditor", id: "profile-editor" }
  });
  expect(artifact.composedDocument["compositions"]).toMatchObject([
    { name: "profile/ProfileEditor", version: "1.0.0" }
  ]);
  expect(artifact.graph).toHaveLength(2);
  expect(artifact.integrity).toMatch(/^sha256-[A-Za-z0-9_-]{43}$/u);
  expect(artifact.sourceMap["/view"]).toMatchObject({
    sourceId: "src/modules/application.module.json"
  });
  expect(prepareUnifoldDocument(artifact.composedDocument).status).toBe(
    UnifoldPreparationStatus.Valid
  );
});

it("mounts locked module authoring with durable non-empty collection identity", async () => {
  const registry = await createUiModuleRegistry([
    { module: collectionModule(), sourceId: "collection.module.json" }
  ]);
  if (registry.status !== UiModuleRegistryStatus.Ready) throw new Error("Expected registry.");
  const resolution = await resolveUiModule(registry.registry, {
    exportName: "application",
    moduleId: "org.unifold.reference.collection",
    version: "1.0.0"
  });
  if (resolution.status !== UiModuleResolutionStatus.Resolved) throw new Error("Expected module.");
  const mounted = await mountCollectionArtifact(resolution.artifact);
  expectMountedCollection(mounted.application);
  mounted.application.dispose();
  mounted.container.remove();
});

async function mountCollectionArtifact(
  artifact: UiResolvedModuleArtifact
): Promise<{ readonly application: UnifoldApplicationPort; readonly container: HTMLElement }> {
  const input = await createUiModuleApplicationInput(artifact, artifact.integrity);
  const container = document.createElement("div");
  document.body.append(container);
  const mounted = mountUnifoldApplication(input.document, container, {
    layoutRegistry: input.layoutRegistry
  });
  expect(mounted.status).toBe(UnifoldApplicationMountStatus.Mounted);
  if (mounted.status !== UnifoldApplicationMountStatus.Mounted) throw new Error("Expected mount.");
  return { application: mounted.application, container };
}

function expectMountedCollection(application: UnifoldApplicationPort): void {
  expect(application.document.nodesById["item::a%2Fb"]).toBeDefined();
  const update = application.applyCollectionOperation({
    collectionId: "items",
    expectedRevision: "revision-1",
    index: 1,
    item: { id: "c::d", label: "Second" },
    revision: "revision-2",
    type: UiCollectionOperationType.Insert
  });
  expect(update.status).toBe(UnifoldApplicationUpdateStatus.Applied);
  expect(application.document.nodesById["item::c%3A%3Ad"]).toBeDefined();
  expect(application.authored).toMatchObject({
    revision: "revision-2",
    variables: {
      items: [
        { id: "a/b", label: "First" },
        { id: "c::d", label: "Second" }
      ]
    }
  });
}

function expectReferenceView(view: unknown): void {
  expect(view).toMatchObject({
    $children: [
      { $comp: "Heading", content: "Module-authored profile", id: "module-heading" },
      {
        $children: [
          { $comp: "TextField", events: { input: "NAME_CHANGED" }, id: "module-name" },
          { $comp: "Button", id: "module-submit" }
        ],
        $comp: "Form",
        id: "module-form"
      }
    ],
    $comp: "Stack",
    id: "module-page"
  });
}

function requirePrepared(result: ReturnType<typeof prepareUnifoldDocument>) {
  if (result.prepared === undefined) throw new Error("Expected the reference module to compile.");
  return result.prepared;
}

function entry() {
  return {
    exportName: "application",
    moduleId: "org.unifold.reference.application",
    version: "1.0.0"
  };
}

function collectionModule() {
  return {
    $schema: "https://schemas.unifold.org/ui-module/1.0/schema.json",
    exports: {
      compositions: [],
      documents: [{ document: collectionDocument(), name: "application" }],
      resources: []
    },
    id: "org.unifold.reference.collection",
    imports: [],
    schemaVersion: "1.0.0",
    version: "1.0.0"
  };
}

function collectionDocument() {
  return {
    $schema: "https://schemas.unifold.org/layout-document/1.0/schema.json",
    catalog: { name: "unifold-core", version: "1.0.0" },
    controls: {
      contractVersion: "1.0.0",
      nodes: [
        { id: "form", kind: "form" },
        { id: "items", key: "items", kind: "array", parentId: "form" }
      ]
    },
    id: "module-collection",
    layoutType: "collection-page",
    layoutVersion: "1.0.0",
    layouts: [collectionLayout()],
    revision: "revision-1",
    schemaVersion: "1.0.0",
    variables: { items: [{ id: "a/b", label: "First" }] }
  };
}

function collectionLayout() {
  return {
    layoutType: "collection-page",
    template: {
      children: [
        {
          children: [
            {
              collection: "items",
              for: "item in {{items}}",
              id: "item",
              key: "id",
              props: { label: "{{item.label}}", value: "{{item.label}}" },
              type: "TextField"
            }
          ],
          id: "items",
          type: "Stack"
        }
      ],
      id: "form",
      type: "Form"
    },
    variables: { items: { required: true, type: "array" } },
    version: "1.0.0"
  };
}
