import { expect, it } from "vitest";
import { createInitialNodeState } from "./initial-node-state.js";
import { setValue } from "./lifecycle.test-data.js";
import { controlNode } from "./test-helpers.js";

it("builds and initializes revision-zero node state", () => {
  const state = createInitialNodeState(
    [controlNode("field", "before")],
    undefined,
    undefined,
    (draft) => draft.update("field", setValue("after"))
  );
  expect(state.revision).toBe(0);
  expect(state.nodes["field"]?.control?.value).toBe("after");
  expect(state.children["field"]).toEqual([]);
});

it("rejects duplicate initial nodes", () => {
  expect(() =>
    createInitialNodeState([controlNode("field", "first"), controlNode("field", "second")])
  ).toThrow("Duplicate node: field");
});

it("rejects an initial node whose visual parent is absent", () => {
  const orphan = {
    ...controlNode("field", "value"),
    controlChildIds: [],
    parentId: "missing"
  };
  expect(() => createInitialNodeState([orphan])).toThrow("Unknown parent: missing");
});
