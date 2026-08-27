import { UiControlNodeKind, UiControlTopologyVersion } from "@unislang/unifold-contracts";
import { expect, it } from "vitest";

import {
  coupleLayoutCollectionControls,
  recordCollectionMember
} from "./layout-collection-controls.js";
import type { CompositionDiagnostic, LayoutCollectionDefinition } from "./types.js";

it("generates ordered durable children for an explicit array or record authority", () => {
  [UiControlNodeKind.Array, UiControlNodeKind.Record].forEach((kind) => {
    const diagnostics: CompositionDiagnostic[] = [];
    expect(
      coupleLayoutCollectionControls(topology(kind), collections(), members(), diagnostics)
    ).toMatchObject({
      nodes: [
        { id: "form", kind: UiControlNodeKind.Form },
        { id: "items", kind },
        { id: "field::a", key: "a", kind: UiControlNodeKind.Control, parentId: "items" },
        { id: "field::b", key: "b", kind: UiControlNodeKind.Control, parentId: "items" }
      ]
    });
    expect(diagnostics).toEqual([]);
  });
});

it("rejects missing, incompatible, duplicate, and explicitly authored member controls", () => {
  const cases = [
    undefined,
    topology(UiControlNodeKind.Group),
    { ...topology(UiControlNodeKind.Array), nodes: [] },
    {
      ...topology(UiControlNodeKind.Array),
      nodes: [...topology(UiControlNodeKind.Array).nodes, { id: "field::a", kind: "control" }]
    }
  ];
  cases.forEach((value) => {
    const diagnostics: CompositionDiagnostic[] = [];
    expect(coupleLayoutCollectionControls(value, collections(), members(), diagnostics)).toBe(
      undefined
    );
    expect(diagnostics[0]).toMatchObject({ path: "/template/children/0/collection" });
  });
});

it("records only expanded members of named collections", () => {
  const recorded: ReturnType<typeof members> = [];
  recordCollectionMember("items", "a", [{ id: "field::a" }], recorded);
  recordCollectionMember(undefined, "b", [{ id: "field::b" }], recorded);
  recordCollectionMember("items", "c", [], recorded);
  expect(recorded).toEqual([{ collectionId: "items", id: "field::a", key: "a" }]);
});

function topology(kind: UiControlNodeKind) {
  return {
    contractVersion: UiControlTopologyVersion.Version1,
    nodes: [
      { id: "form", kind: UiControlNodeKind.Form },
      { id: "items", key: "items", kind, parentId: "form" }
    ]
  };
}

function collections(): Readonly<Record<string, LayoutCollectionDefinition>> {
  return {
    items: {
      controlId: "items",
      declarationPointer: "/template/children/0/collection",
      keyProperty: "id",
      sourcePointer: "/variables/items"
    }
  };
}

function members() {
  return [
    { collectionId: "items", id: "field::a", key: "a" },
    { collectionId: "items", id: "field::b", key: "b" }
  ];
}
