import { produce } from "immer";
import { expect, it } from "vitest";
import { controlChildId, moveControlChild } from "./control-collection.js";
import type { NormalizedNodeState } from "./store-types.js";
import { controlNode } from "./test-helpers.js";

it("resolves and reorders controls by durable key", () => {
  const moved = produce(fixture(), (draft) => moveControlChild(draft, "items", "b", 0));
  expect(moved.controlChildren["items"]).toEqual(["second", "first"]);
  expect(controlChildId(moved as never, "items", "a")).toBe("first");
  expect(() => controlChildId(moved as never, "items", "missing")).toThrow("Unknown or ambiguous");
});

function fixture(): NormalizedNodeState {
  const items = controlNode("items", "");
  const first = { ...controlNode("first", "A"), controlKey: "a" };
  const second = { ...controlNode("second", "B"), controlKey: "b" };
  return {
    children: { first: [], items: [], second: [] },
    controlChildren: { first: [], items: ["first", "second"], second: [] },
    nodes: { first, items, second },
    revision: 0,
    validationRoutes: {}
  };
}
