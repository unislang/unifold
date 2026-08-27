import { UiCollectionOperationType, UiNodeKind } from "@unislang/unifold-contracts";
import type { UiNodeSnapshot } from "@unislang/unifold-events";
import type { UnifoldIrDocument } from "@unislang/unifold-ir";
import { expect, it } from "vitest";

import { collectionFocusTarget, migratedFocusedNodeId } from "./application-focus.js";

it("selects deterministic targets only when the focused collection member is removed", () => {
  const previous = previousNodes();
  expect(target(previous, nextDocument(["a", "c"]), 1)).toBe("c");
  expect(target(focused(previous, "nested"), nextDocument(["a", "b"]), 2)).toBe("b");
  expect(target(previous, nextDocument([]), 1)).toBeUndefined();
  expect(target(previous, nextDocument([], ["add-item"]), 1)).toBeUndefined();
  expect(target(previous, nextDocument([], ["add-item"], "add-item"), 1)).toBe("add-item");
  expect(target(previous, nextDocument([], [], "missing"), 1)).toBeUndefined();
  expect(target(focused(previous, "outside"), nextDocument(["a", "c"]), 1)).toBeUndefined();
  expect(migratedFocusedNodeId(previous, migration())).toBe("successor");
  expect(
    collectionFocusTarget(previous, nextDocument(["a", "b", "c"]), {
      collectionId: "items",
      fromIndex: 1,
      toIndex: 0,
      type: UiCollectionOperationType.Move
    })
  ).toBeUndefined();
});

function target(
  previous: readonly UiNodeSnapshot[],
  next: UnifoldIrDocument,
  fromIndex: number
): string | undefined {
  return collectionFocusTarget(previous, next, {
    collectionId: "items",
    fromIndex,
    type: UiCollectionOperationType.Remove
  });
}

function migration() {
  return { nodeIdentityAliases: { successor: "b" }, resetNodeIds: [] };
}

function previousNodes(): readonly UiNodeSnapshot[] {
  return [
    node("items", false, { controlChildIds: ["a", "b", "c"] }),
    node("a", false, { controlParentId: "items" }),
    node("b", true, { controlParentId: "items" }),
    node("c", false, { controlParentId: "items" }),
    node("nested", false, { parentId: "c" }),
    node("outside", false)
  ];
}

function focused(nodes: readonly UiNodeSnapshot[], id: string): readonly UiNodeSnapshot[] {
  return nodes.map((node) => ({
    ...node,
    base: { ...node.base, focused: node.id === id }
  }));
}

function nextDocument(
  children: readonly string[],
  additionalIds: readonly string[] = [],
  emptyFocusTargetId?: string
): UnifoldIrDocument {
  const ids = ["items", ...children, ...additionalIds];
  return {
    collectionBehaviorsById:
      emptyFocusTargetId === undefined ? {} : { items: { emptyFocusTargetId } },
    nodesById: Object.fromEntries(
      ids.map((id) => [id, node(id, false, id === "items" ? { controlChildIds: children } : {})])
    )
  } as unknown as UnifoldIrDocument;
}

function node(
  id: string,
  isFocused: boolean,
  topology: Partial<UiNodeSnapshot> = {}
): UiNodeSnapshot {
  return {
    attributes: {},
    base: {
      busy: false,
      dataClassification: "public" as never,
      disabled: false,
      focused: isFocused,
      interactive: true,
      mounted: true,
      readonly: false,
      visible: true
    },
    definitionVersion: "1",
    id,
    instanceId: id,
    kind: UiNodeKind.Component,
    properties: {},
    revision: 0,
    scopePath: [id],
    type: "fixture",
    ...topology
  };
}
