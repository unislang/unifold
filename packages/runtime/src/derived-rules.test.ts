import {
  UiDerivedRuleOutputKind,
  UiDerivedRuleSchemaVersion,
  type UiDerivedRuleDefinition
} from "@unislang/unifold-contracts";
import { UiCommandType } from "@unislang/unifold-events";
import { createValidatorRegistry } from "@unislang/unifold-forms";
import { NormalizedNodeStore } from "@unislang/unifold-reactivity";
import { expect, it } from "vitest";

import { applyStateCommand } from "./command-handlers.js";
import { applyRuntimeDerivedRules, compileRuntimeDerivedRules } from "./derived-rules.js";
import { controlNode } from "./runtime.test-data.js";

it("applies reachable rule commands inside the caller transaction draft", () => {
  const nodes = [controlNode("age", "21"), controlNode("submit", "")];
  const program = compileRuntimeDerivedRules([disabledRule()], nodes);
  if (program === undefined) throw new Error("Expected a rule program.");
  const validators = createValidatorRegistry();
  const store = new NormalizedNodeStore(nodes);
  store.transact(metadata(), (draft) => {
    applyStateCommand(
      draft,
      { id: "age", type: UiCommandType.ControlSetValue, value: "16" },
      validators
    );
    applyRuntimeDerivedRules(program, [{ nodeId: "age", pointer: "/control" }], draft, validators);
  });
  expect(store.getSnapshot("submit").base.disabled).toBe(true);
  expect(store.getTransaction(1)?.changedNodeIds).toEqual(["age", "submit"]);
});

function disabledRule(): UiDerivedRuleDefinition {
  return {
    expression: { "<": [{ var: "age" }, 18] },
    id: "disable-submit",
    inputs: [{ name: "age", nodeId: "age", pointer: "/control/value" }],
    output: { kind: UiDerivedRuleOutputKind.ControlSetDisabled, nodeId: "submit" },
    schemaVersion: UiDerivedRuleSchemaVersion.Version1,
    version: "1.0.0"
  };
}

function metadata() {
  return {
    correlationId: "correlation",
    id: "rule",
    timestamp: "2026-08-25T00:00:00.000Z"
  };
}
