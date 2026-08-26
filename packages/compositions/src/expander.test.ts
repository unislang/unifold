import {
  UiCompositionExportKind,
  UiCompositionSelectionKind,
  type JsonUiNode,
  type UiCompositionManifest
} from "@unislang/unifold-contracts";
import { expect, it } from "vitest";

import {
  CompositionContractVersion,
  CompositionExpansionStatus,
  expandComposedUiDocument,
  type CompositionDefinition,
  type CompositionExpansionResult
} from "./index.js";
import {
  applicationView,
  composedDocument,
  profileDefinition,
  profileInstance
} from "./expander.test-data.js";

it("substitutes parameters, fills slots, namespaces ids, and publishes exports", () => {
  const result = expandComposedUiDocument(composedDocument());
  const document = requireDocument(result);
  const composition = requireChild(document.view, 0);

  expect(result.status).toBe(CompositionExpansionStatus.Valid);
  expect(document["compositions"]).toBeUndefined();
  expect(composition.id).toBe("profile-editor");
  expect(requireChild(composition, 0)).toMatchObject({
    id: "profile-editor::name",
    label: "Your name"
  });
  expect(requireChild(composition, 1).id).toBe("profile-editor::slot:actions::submit");
  expect(result.exportsByInstanceId["profile-editor"]).toEqual({
    field: "profile-editor::name",
    root: "profile-editor"
  });
  const manifest = requireManifest(result);
  expect(manifest.instances[0]?.exports["field"]).toMatchObject({
    kind: UiCompositionExportKind.Selection,
    nodeId: "profile-editor::name",
    selection: UiCompositionSelectionKind.ControlValue
  });
  expect(manifest.nodeProvenanceById["profile-editor::name"]).toMatchObject({
    definitionSourcePointer: "/compositions/0/template/$children/0",
    instanceId: "profile-editor",
    instanceSourcePointer: "/view/$children/0",
    localId: "name"
  });
});

it("uses defaults and preserves non-composition document properties", () => {
  const definition = profileDefinition({
    parameters: { label: { default: "Name", required: false, type: "string" } }
  } as Partial<CompositionDefinition>);
  const instance = profileInstance({ parameters: {} });
  const result = expandComposedUiDocument(
    composedDocument([definition], applicationView(instance))
  );
  const composition = requireChild(requireDocument(result).view, 0);

  expect(requireDocument(result)["id"]).toBe("fixture");
  expect(requireChild(composition, 0)["label"]).toBe("Name");
});

it("expands nested compositions with hierarchical identities and exports", () => {
  const definitions = [outerDefinition(), innerDefinition()];
  const view = applicationView({ $compose: "Outer", $version: "1", id: "outer" });
  const result = expandComposedUiDocument(composedDocument(definitions, view));
  const outer = requireChild(requireDocument(result).view, 0);
  const inner = requireChild(outer, 0);

  expect(inner.id).toBe("outer::inner");
  expect(requireChild(inner, 0).id).toBe("outer::inner::leaf");
  expect(result.exportsByInstanceId["outer"]).toEqual({ inner: "outer::inner" });
  expect(result.exportsByInstanceId["outer::inner"]).toEqual({ leaf: "outer::inner::leaf" });
});

function requireDocument(result: CompositionExpansionResult) {
  if (result.document === undefined) throw new Error("Expected an expanded document.");
  return result.document;
}

function requireManifest(result: CompositionExpansionResult): UiCompositionManifest {
  if (result.manifest === undefined) throw new Error("Expected a composition manifest.");
  return result.manifest;
}

function requireChild(node: JsonUiNode, index: number): JsonUiNode {
  const child = node.$children?.[index];
  if (child === undefined) throw new Error(`Expected child ${index} for ${node.id}.`);
  return child;
}

function outerDefinition(): CompositionDefinition {
  return {
    contractVersion: CompositionContractVersion.Version1,
    exports: {
      inner: {
        kind: UiCompositionExportKind.Selection,
        localId: "inner",
        selection: UiCompositionSelectionKind.Snapshot
      }
    },
    name: "Outer",
    parameters: {},
    slots: [],
    template: {
      $children: [{ $compose: "Inner", $version: "1", id: "inner" }],
      $comp: "Composition",
      id: "root"
    },
    version: "1"
  };
}

function innerDefinition(): CompositionDefinition {
  return {
    contractVersion: CompositionContractVersion.Version1,
    exports: {
      leaf: {
        kind: UiCompositionExportKind.Selection,
        localId: "leaf",
        selection: UiCompositionSelectionKind.Snapshot
      }
    },
    name: "Inner",
    parameters: {},
    slots: [],
    template: {
      $children: [{ $comp: "Text", id: "leaf" }],
      $comp: "Composition",
      id: "root"
    },
    version: "1"
  };
}
