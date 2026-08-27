import { UiCommandType, type UiCommand } from "@unislang/unifold-events";
import type { UiNodeTransactionDraft } from "@unislang/unifold-reactivity";
import { expect, it } from "vitest";

import { ruleCommandDependencies } from "./rule-command-dependencies.js";

it("maps state commands to precise rule dependency footprints", () => {
  const commands: UiCommand[] = [
    { id: "field", type: UiCommandType.ControlSetValue, value: "next" },
    {
      id: "summary",
      properties: { "a/b": true, disabled: true },
      type: UiCommandType.NodePatchProperties
    }
  ];
  const dependencies = ruleCommandDependencies(commands, draft(), { rules: [] } as never);
  expect(dependencies).toEqual([
    { nodeId: "field", pointer: "/control" },
    { nodeId: "summary", pointer: "/properties/a~1b" },
    { nodeId: "summary", pointer: "/properties/disabled" },
    { nodeId: "summary", pointer: "/base/disabled" },
    { nodeId: "summary", pointer: "/base/ownDisabled" }
  ]);
});

it("expands form changes to descendant controls", () => {
  const command: UiCommand = { id: "form", type: UiCommandType.FormReset };
  const dependencies = ruleCommandDependencies([command], draft(), { rules: [] } as never);
  expect(dependencies.map(({ nodeId }) => nodeId)).toEqual(["form", "field"]);
});

function draft(): UiNodeTransactionDraft {
  return {
    add() {
      throw new Error("Unused test port.");
    },
    controlDescendantIds: () => ["field"],
    descendantIds: () => ["field"],
    getSnapshot: () => {
      throw new Error("Unused test port.");
    },
    reconcile() {
      throw new Error("Unused test port.");
    },
    reconcileControlDisabled() {
      throw new Error("Unused test port.");
    },
    moveControl() {
      throw new Error("Unused test port.");
    },
    remove() {
      throw new Error("Unused test port.");
    },
    removeControl() {
      throw new Error("Unused test port.");
    },
    update() {
      throw new Error("Unused test port.");
    }
  };
}
