import { expect, it } from "vitest";

import { uiModuleIntegrity } from "./integrity.js";
import { createUiModuleApplicationInput } from "./module-application.js";
import { createUiModuleRegistry } from "./registry.js";
import { resolveUiModule } from "./resolver.js";
import {
  collectionLayoutDocumentFixture,
  layoutDefinitionFixture,
  moduleFixture
} from "./test-fixtures.test-data.js";
import {
  UiModuleRegistryStatus,
  UiModuleResolutionStatus,
  type UiResolvedModuleArtifact
} from "./types.js";

it("restores locked Scratch authoring and private collection authority", async () => {
  const artifact = await collectionArtifact();
  const input = await createUiModuleApplicationInput(artifact, artifact.integrity);
  expect(input.document).toMatchObject({
    layoutType: "collection-page",
    variables: { items: [] }
  });
  expect(input.layoutRegistry.snapshot()).toEqual([]);
  expect(input.document).not.toBe(artifact.authoredDocument);
});

it("rejects a stale lock and any mutation covered by artifact integrity", async () => {
  const artifact = await collectionArtifact();
  await expect(createUiModuleApplicationInput(artifact, integrity("x"))).rejects.toThrow(
    "trusted lock"
  );
  const changed = {
    ...artifact,
    authoredDocument: { ...artifact.authoredDocument, revision: "tampered" }
  };
  await expect(createUiModuleApplicationInput(changed, artifact.integrity)).rejects.toThrow(
    "trusted lock"
  );
});

it("reconstructs only integrity-covered valid layout definitions", async () => {
  const artifact = await collectionArtifact();
  const definition = layoutDefinitionFixture("external-page", "External");
  await expect(
    createUiModuleApplicationInput(
      { ...artifact, layoutDefinitions: [definition] },
      artifact.integrity
    )
  ).rejects.toThrow("trusted lock");
  const valid = await artifactWithLayouts(artifact, [definition]);
  const input = await createUiModuleApplicationInput(valid, valid.integrity);
  expect(input.layoutRegistry.snapshot()).toEqual([definition]);
});

async function collectionArtifact() {
  const source = moduleFixture({
    exports: {
      ...moduleFixture().exports,
      documents: [{ document: collectionLayoutDocumentFixture(), name: "application" }]
    }
  });
  const registry = await createUiModuleRegistry([{ module: source, sourceId: "collection.json" }]);
  if (registry.status !== UiModuleRegistryStatus.Ready)
    throw new Error("Expected module registry.");
  const result = await resolveUiModule(registry.registry, {
    exportName: "application",
    moduleId: source.id,
    version: source.version
  });
  if (result.status !== UiModuleResolutionStatus.Resolved) throw new Error("Expected resolution.");
  return result.artifact;
}

function integrity(character: string): string {
  return `sha256-${character.repeat(43)}`;
}

async function artifactWithLayouts(
  artifact: UiResolvedModuleArtifact,
  layoutDefinitions: UiResolvedModuleArtifact["layoutDefinitions"]
): Promise<UiResolvedModuleArtifact> {
  const content = { ...artifact, layoutDefinitions };
  Reflect.deleteProperty(content, "integrity");
  return { ...artifact, integrity: await uiModuleIntegrity(content), layoutDefinitions };
}
