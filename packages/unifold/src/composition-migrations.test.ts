import {
  UiCompositionExportKind,
  UiCompositionSelectionKind,
  UiNodeKind,
  type UiCompositionInstanceManifest
} from "@unislang/unifold-contracts";
import type { UnifoldIrDocument, UnifoldIrNode } from "@unislang/unifold-ir";
import { expect, it } from "vitest";

import {
  UiCompositionMigrationError,
  UiCompositionUnmappedMigration,
  planCompositionMigration,
  type UiCompositionVersionMigration
} from "./composition-migrations.js";

it("applies codec aliases only when the legacy source is the active identity", () => {
  const canonical = directDocument([node("profile%3Aeditor")], {
    "profile%3Aeditor": "profile:editor"
  });
  const legacy = directDocument([node("profile:editor")]);
  expect(planCompositionMigration(legacy, canonical).nodeIdentityAliases).toEqual({
    "profile%3Aeditor": "profile:editor"
  });
  expect(planCompositionMigration(canonical, canonical).nodeIdentityAliases).toEqual({});
});

it("resets changed instances while preserving explicitly mapped compatible exports", () => {
  const current = composedDocument("Editor", "1", "old-field", "TextField", "field");
  const next = composedDocument("Editor", "2", "new-field", "TextField", "name", true);
  const plan = planCompositionMigration(current, next, [migration("Editor", "1", "Editor", "2")]);
  expect(plan.nodeIdentityAliases).toEqual({ "new-field": "old-field" });
  expect(plan.resetNodeIds).toEqual(["added", "editor"]);
});

it("uses an exact reset edge for incompatible exported controls", () => {
  const current = composedDocument("Editor", "1", "field", "TextField", "field");
  const next = composedDocument("Editor", "2", "field", "Select", "field");
  const edge = { ...migration("Editor", "1", "Editor", "2"), preserve: [] };
  expect(planCompositionMigration(current, next, [edge]).resetNodeIds).toEqual(["editor", "field"]);
});

it("rejects missing, malformed, ambiguous, and incompatible migration policies", () => {
  const current = composedDocument("Editor", "1", "old-field", "TextField", "field");
  const next = composedDocument("Editor", "2", "new-field", "Select", "name");
  expectFailure(current, next, [], "missing-edge");
  expectFailure(current, next, [migration("Editor", "1", "Editor", "2")], "incompatible-node");
  expectFailure(current, next, [migration("Editor", "0", "Editor", "2")], "missing-edge");
  const edge = migration("Editor", "1", "Editor", "2");
  expectFailure(current, next, [edge, edge], "duplicate-edge");
  expectFailure(current, next, [edge, migration("Editor", "2", "Editor", "1")], "cycle");
  expectFailure(
    current,
    next,
    [{ ...edge, preserve: [{ source: "missing", target: "name" }] }],
    "unknown-export"
  );
});

function migration(
  fromName: string,
  fromVersion: string,
  toName: string,
  toVersion: string
): UiCompositionVersionMigration {
  return {
    from: { name: fromName, version: fromVersion },
    preserve: [{ source: "field", target: "name" }],
    to: { name: toName, version: toVersion },
    unmapped: UiCompositionUnmappedMigration.Reset
  };
}

function composedDocument(
  name: string,
  version: string,
  fieldId: string,
  fieldType: string,
  exportName: string,
  added = false
): UnifoldIrDocument {
  const instance = compositionInstance(name, version, fieldId, exportName);
  const nodes = [node("editor", "Composition", "editor"), node(fieldId, fieldType, "editor")];
  if (added) nodes.push(node("added", "Text", "editor"));
  return document(nodes, { editor: instance });
}

function compositionInstance(
  name: string,
  version: string,
  nodeId: string,
  exportName: string
): UiCompositionInstanceManifest {
  return {
    ancestry: ["editor"],
    definitionName: name,
    definitionSourcePointer: "/compositions/0",
    definitionVersion: version,
    exports: {
      [exportName]: {
        kind: UiCompositionExportKind.Selection,
        localId: nodeId,
        nodeId,
        selection: UiCompositionSelectionKind.ControlValue
      }
    },
    instanceId: "editor",
    instanceSourcePointer: "/view",
    rootNodeId: "editor"
  };
}

function node(id: string, componentType = "Text", instanceId?: string): UnifoldIrNode {
  return {
    childIds: [],
    componentType,
    ...compositionProvenance(id, instanceId),
    eventBindings: {},
    id,
    kind: nodeKind(componentType),
    properties: {},
    scopePath: []
  };
}

function compositionProvenance(id: string, instanceId: string | undefined) {
  if (instanceId === undefined) return {};
  return {
    composition: {
      ancestry: [instanceId],
      definitionName: "fixture",
      definitionVersion: "1",
      instanceId,
      instanceSourcePointer: "/view",
      localId: id
    }
  };
}

function nodeKind(componentType: string): UiNodeKind {
  return componentType === "Text" ? UiNodeKind.Component : UiNodeKind.Control;
}

function directDocument(
  nodes: readonly UnifoldIrNode[],
  aliases: Readonly<Record<string, string>> = {}
): UnifoldIrDocument {
  return document(nodes, {}, aliases);
}

function document(
  nodes: readonly UnifoldIrNode[],
  compositionsByInstanceId: UnifoldIrDocument["compositionsByInstanceId"],
  nodeIdentityAliases: Readonly<Record<string, string>> = {}
): UnifoldIrDocument {
  return {
    compositionsByInstanceId,
    documentId: "fixture",
    documentRevision: "1",
    irVersion: "1.0.0",
    machines: [],
    nodeIdentityAliases,
    nodesById: Object.fromEntries(nodes.map((value) => [value.id, value])),
    renderOrder: nodes.map(({ id }) => id),
    rootNodeId: rootNodeId(nodes),
    rules: [],
    source: {
      documentSchemaVersion: "1.0.0",
      jsonUiProfile: "unifold-jsonui@1.0.0",
      jsonUiUpstreamRevision: "9c3ed3a"
    },
    sourcePointersByNodeId: {},
    storesById: {}
  } as unknown as UnifoldIrDocument;
}

function rootNodeId(nodes: readonly UnifoldIrNode[]): string {
  return nodes.length === 0 ? "root" : (nodes[0] as UnifoldIrNode).id;
}

function expectFailure(
  current: UnifoldIrDocument,
  next: UnifoldIrDocument,
  migrations: readonly UiCompositionVersionMigration[],
  code: string
): void {
  expect(() => planCompositionMigration(current, next, migrations)).toThrow(
    new UiCompositionMigrationError(code)
  );
}
