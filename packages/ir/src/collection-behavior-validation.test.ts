import {
  UiCollectionBehaviorVersion,
  UiControlNodeKind,
  UiControlTopologyVersion
} from "@unislang/unifold-contracts";
import { expect, it } from "vitest";

import { CompilationStatus, DiagnosticCode, UnifoldIrVersion } from "./enums.js";
import { compileUiDocument } from "./compiler.js";
import { compilerDocument } from "./compiler.test-data.js";

interface MutableNode extends Record<string, unknown> {
  $children?: MutableNode[];
}

it("compiles one exact collection behavior into IR 1.1", () => {
  const result = compileUiDocument(collectionDocument());

  expect(result).toMatchObject({ diagnostics: [], status: CompilationStatus.Valid });
  expect(result.document).toMatchObject({
    collectionBehaviorsById: { items: { emptyFocusTargetId: "add-area" } },
    irVersion: UnifoldIrVersion.Version1_1
  });
  expect(result.document?.collectionBehaviorsById["items"]).not.toHaveProperty("collectionId");
});

it.each([
  ["unknown version", invalidVersion(), "/collectionBehaviors/contractVersion"],
  ["missing nodes", missingNodes(), "/collectionBehaviors/nodes"],
  ["unknown definition key", unknownDefinitionKey(), "/collectionBehaviors/executable"],
  ["unknown node key", unknownNodeKey(), "/collectionBehaviors/nodes/0/selector"],
  ["duplicate collection", duplicateCollection(), "/collectionBehaviors/nodes/1/collectionId"],
  ["unknown collection", withCollectionId("missing"), "/collectionBehaviors/nodes/0/collectionId"],
  [
    "non-collection control",
    withCollectionId("collection-form"),
    "/collectionBehaviors/nodes/0/collectionId"
  ],
  ["same target", withTargetId("items"), "/collectionBehaviors/nodes/0/emptyFocusTargetId"],
  ["unknown target", withTargetId("missing"), "/collectionBehaviors/nodes/0/emptyFocusTargetId"],
  [
    "non-focusable subtree",
    nonFocusableTarget(),
    "/collectionBehaviors/nodes/0/emptyFocusTargetId"
  ],
  ["disabled target", disabledTarget(), "/collectionBehaviors/nodes/0/emptyFocusTargetId"],
  [
    "collection descendant",
    collectionDescendantTarget(),
    "/collectionBehaviors/nodes/0/emptyFocusTargetId"
  ]
])("rejects an %s", (_label, document, path) => {
  const result = compileUiDocument(document);

  expect(result.document).toBeUndefined();
  expect(result.diagnostics).toContainEqual(
    expect.objectContaining({ code: DiagnosticCode.InvalidCollectionBehavior, path })
  );
});

it("bounds collection behavior validation work", () => {
  const document = collectionDocument();
  document.collectionBehaviors.nodes = Array.from({ length: 10_001 }, () => behaviorNode());
  const result = compileUiDocument(document);

  expect(result.diagnostics).toContainEqual(
    expect.objectContaining({
      code: DiagnosticCode.InvalidCollectionBehavior,
      path: "/collectionBehaviors/nodes"
    })
  );
});

function collectionDocument() {
  return {
    ...compilerDocument(),
    collectionBehaviors: {
      contractVersion: UiCollectionBehaviorVersion.Version1,
      nodes: [behaviorNode()]
    },
    controls: {
      contractVersion: UiControlTopologyVersion.Version1,
      nodes: [
        { id: "collection-form", kind: UiControlNodeKind.Form },
        {
          id: "items",
          key: "items",
          kind: UiControlNodeKind.Array,
          parentId: "collection-form"
        }
      ]
    },
    view: collectionView()
  };
}

function collectionView(): MutableNode {
  return {
    $children: [
      { $comp: "Stack", id: "items" },
      {
        $children: [{ $comp: "Button", id: "add-item", label: "Add item" }],
        $comp: "Stack",
        id: "add-area"
      }
    ],
    $comp: "Form",
    id: "collection-form",
    label: "Items"
  };
}

function behaviorNode(): Record<string, unknown> {
  return { collectionId: "items", emptyFocusTargetId: "add-area" };
}

function invalidVersion() {
  const document = collectionDocument();
  document.collectionBehaviors.contractVersion = "2.0.0" as UiCollectionBehaviorVersion;
  return document;
}

function missingNodes() {
  const document = collectionDocument();
  Reflect.deleteProperty(document.collectionBehaviors, "nodes");
  return document;
}

function unknownDefinitionKey() {
  const document = collectionDocument();
  return {
    ...document,
    collectionBehaviors: { ...document.collectionBehaviors, executable: true }
  };
}

function unknownNodeKey() {
  const document = collectionDocument();
  document.collectionBehaviors.nodes = [{ ...behaviorNode(), selector: "button" }];
  return document;
}

function duplicateCollection() {
  const document = collectionDocument();
  document.collectionBehaviors.nodes = [behaviorNode(), behaviorNode()];
  return document;
}

function withCollectionId(collectionId: string) {
  const document = collectionDocument();
  document.collectionBehaviors.nodes = [{ ...behaviorNode(), collectionId }];
  return document;
}

function withTargetId(emptyFocusTargetId: string) {
  const document = collectionDocument();
  document.collectionBehaviors.nodes = [{ ...behaviorNode(), emptyFocusTargetId }];
  return document;
}

function nonFocusableTarget() {
  const document = withTargetId("message");
  document.view.$children?.push({ $comp: "Text", content: "Empty", id: "message" });
  return document;
}

function disabledTarget() {
  const document = withTargetId("add-item");
  requiredChild(requiredChild(document.view, 1), 0)["disabled"] = true;
  return document;
}

function requiredChild(node: MutableNode, index: number): MutableNode {
  const child = node.$children?.[index];
  if (child === undefined) throw new Error("Expected a fixture child.");
  return child;
}

function collectionDescendantTarget() {
  const document = withTargetId("member");
  const items = document.view.$children?.[0];
  if (items !== undefined)
    items.$children = [{ $comp: "TextField", id: "member", label: "Member" }];
  document.controls.nodes.push({
    id: "member",
    key: "member",
    kind: UiControlNodeKind.Control,
    parentId: "items"
  });
  return document;
}
