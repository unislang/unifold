import { UiCommandType, type UiCommand } from "@unislang/unifold-events";
import { expect, it } from "vitest";

import { reconciledCompositionInstances, removedOwnerIds } from "./structure-reconciliation.js";
import { controlNode } from "./runtime.test-data.js";

it("finds removed and replaced node lifetimes", () => {
  const field = controlNode("field", "A");
  const removed = controlNode("removed", "A");
  const commands = [
    {
      compositionInstances: {},
      nodes: [{ ...field, type: "Select" }],
      type: UiCommandType.StructureReconcile
    }
  ] satisfies readonly UiCommand[];
  expect(removedOwnerIds(commands, [field, removed])).toEqual(["field", "removed"]);
});

it("replaces manifests and rejects multiple reconciliation commands", () => {
  const command = {
    compositionInstances: { editor: {} as never },
    nodes: [],
    type: UiCommandType.StructureReconcile
  } as const;
  expect(reconciledCompositionInstances([command], {})).toBe(command.compositionInstances);
  expect(() => removedOwnerIds([command, command], [])).toThrow("Only one");
});
