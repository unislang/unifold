import { UiNodeKind } from "@unislang/unifold-contracts";
import { expect, it } from "vitest";

import type { RuleCompileNode, RuleDependency } from "./types.js";

it("exposes stable node and dependency contracts", () => {
  const node: RuleCompileNode = { id: "amount", kind: UiNodeKind.Control };
  const dependency: RuleDependency = { nodeId: node.id, pointer: "/control/value" };
  expect(dependency).toEqual({ nodeId: "amount", pointer: "/control/value" });
});
