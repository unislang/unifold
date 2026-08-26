import { UiNodeKind } from "@unislang/unifold-contracts";
import type { UnifoldIrNode } from "@unislang/unifold-ir";
import { expect, it } from "vitest";

import { createNodeSnapshot } from "./snapshot.js";

it("projects authored composition identity and provenance into snapshots", () => {
  const snapshot = createNodeSnapshot(composedNode(), 4);
  expect(snapshot).toMatchObject({
    definitionVersion: "2.1.0",
    instanceId: "editor",
    revision: 4,
    composition: {
      definitionName: "ProfileEditor",
      instanceSourcePointer: "/view",
      localId: "name"
    }
  });
});

it("creates configured aggregate control state for forms", () => {
  const node = { ...composedNode(), kind: UiNodeKind.Form, properties: { validators: ["match"] } };
  expect(createNodeSnapshot(node, 0).control).toMatchObject({
    initialValue: {},
    validatorIds: ["match"],
    value: {}
  });
});

function composedNode(): UnifoldIrNode {
  return {
    childIds: [],
    componentType: "TextField",
    composition: {
      ancestry: ["editor"],
      definitionName: "ProfileEditor",
      definitionSourcePointer: "/compositions/0/template/$children/0",
      definitionVersion: "2.1.0",
      instanceId: "editor",
      instanceSourcePointer: "/view",
      localId: "name"
    },
    id: "editor::name",
    kind: UiNodeKind.Control,
    parentId: "editor",
    properties: { value: "Ada" },
    scopePath: ["editor", "editor::name"]
  };
}
