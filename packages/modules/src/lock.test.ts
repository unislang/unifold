import { expect, it } from "vitest";

import { createTrustedLayoutDefinitionRegistry } from "@unislang/unifold-compositions";

import { createUiModuleLock } from "./lock.js";
import {
  UiModuleLockSchemaUri,
  UiModuleLockSchemaVersion,
  type UiResolvedModuleArtifact,
  type UiResolvedModuleGraphEntry
} from "./types.js";

it("creates a deterministic exact-entry lock independent of registry insertion order", () => {
  const root = graphEntry("org.example.root", "", "root.module.json", "sha256-root");
  const shared = graphEntry("org.example.shared", "shared", "shared.module.json", "sha256-shared");
  const first = createUiModuleLock(artifact([root, shared]), entry(), integrity("i"));
  const second = createUiModuleLock(artifact([shared, root]), entry(), integrity("i"));
  expect(first).toEqual(second);
  expect(first).toMatchObject({
    $schema: UiModuleLockSchemaUri.Version1,
    artifactIntegrity: "sha256-artifact",
    entry: entry(),
    irIntegrity: integrity("i"),
    schemaVersion: UiModuleLockSchemaVersion.Version1
  });
  expect(first.modules.map(({ moduleId }) => moduleId)).toEqual([
    "org.example.root",
    "org.example.shared"
  ]);
});

it("excludes the trusted in-memory layout registry from the portable lock entry", () => {
  const selected = {
    ...entry(),
    layoutRegistry: createTrustedLayoutDefinitionRegistry([])
  };
  expect(createUiModuleLock(artifact([]), selected, integrity("ir")).entry).toEqual(entry());
});

function artifact(graph: readonly UiResolvedModuleGraphEntry[]): UiResolvedModuleArtifact {
  return {
    composedDocument: {},
    document: {},
    graph,
    integrity: "sha256-artifact",
    resources: {},
    sourceMap: {}
  };
}

function entry() {
  return { exportName: "application", moduleId: "org.example.root", version: "1.0.0" };
}

function graphEntry(
  moduleId: string,
  namespace: string,
  sourceId: string,
  integrity: string
): UiResolvedModuleGraphEntry {
  return { integrity, moduleId, namespace, sourceId, version: "1.0.0" };
}

function integrity(character: string): string {
  return `sha256-${character.repeat(43)}`;
}
