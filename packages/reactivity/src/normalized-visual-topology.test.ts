import { expect, it } from "vitest";

import { buildVisualChildren, validateVisualTopology } from "./normalized-visual-topology.js";
import { controlNode } from "./test-helpers.js";

it("validates and indexes visual relationships separately from controls", () => {
  const nodes = [controlNode("root", ""), controlNode("child", "A", "root")];
  expect(() => validateVisualTopology(nodes)).not.toThrow();
  expect(buildVisualChildren(nodes)).toEqual({ child: [], root: ["child"] });
});

it("rejects duplicate, orphaned, and cyclic visual nodes", () => {
  expect(() => validateVisualTopology([controlNode("same", ""), controlNode("same", "")])).toThrow(
    "Duplicate"
  );
  expect(() => validateVisualTopology([controlNode("orphan", "", "missing")])).toThrow("Unknown");
  expect(() =>
    validateVisualTopology([controlNode("a", "", "b"), controlNode("b", "", "a")])
  ).toThrow("cycle");
});
