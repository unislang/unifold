import {
  UiDerivedRuleOutputKind,
  UiDerivedRuleSchemaVersion,
  UiNodeKind,
  type JsonValue,
  type UiDerivedRuleDefinition
} from "@unislang/unifold-contracts";
import { UiCommandType, type UiCommand } from "@unislang/unifold-events";
import { expect, it } from "vitest";

import { compileDerivedRules } from "./compiler.js";
import { evaluateAffectedRules, RuleEvaluationError } from "./evaluator.js";
import type { RuleDependency, RuleEvaluationPort } from "./types.js";

it("evaluates only the reachable DAG once and applies each result in layer order", () => {
  const program = requireProgram([disabledRule(), summaryRule()]);
  const port = mutablePort({
    '["age","/control/value"]': 16,
    '["submit","/base/disabled"]': false,
    '["summary","/properties/text"]': "enabled"
  });
  const result = evaluateAffectedRules(
    program,
    [{ nodeId: "age", pointer: "/control/value" }],
    port
  );
  expect(result.evaluatedRuleIds).toEqual(["disable-submit", "summarize"]);
  expect(result.commands.map(({ type }) => type)).toEqual([
    UiCommandType.ControlSetDisabled,
    UiCommandType.NodePatchProperties
  ]);
});

it("skips equal outputs and fails closed before exceeding evaluation budgets", () => {
  const program = requireProgram([disabledRule()]);
  const port = mutablePort({
    '["age","/control/value"]': 21,
    '["submit","/base/disabled"]': false
  });
  expect(
    evaluateAffectedRules(program, [{ nodeId: "age", pointer: "/control" }], port).commands
  ).toEqual([]);
  expect(() =>
    evaluateAffectedRules(program, [{ nodeId: "age", pointer: "/control" }], port, {
      maxRuleEvaluations: 0
    })
  ).toThrow(RuleEvaluationError);
});

function requireProgram(rules: readonly UiDerivedRuleDefinition[]) {
  const result = compileDerivedRules(rules, [
    { id: "age", kind: UiNodeKind.Control },
    { id: "submit", kind: UiNodeKind.Control },
    { id: "summary", kind: UiNodeKind.Component }
  ]);
  if (result.program === undefined) throw new Error(JSON.stringify(result.diagnostics));
  return result.program;
}

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

function summaryRule(): UiDerivedRuleDefinition {
  return {
    expression: { if: [{ var: "disabled" }, "disabled", "enabled"] },
    id: "summarize",
    inputs: [{ name: "disabled", nodeId: "submit", pointer: "/base/disabled" }],
    output: {
      kind: UiDerivedRuleOutputKind.NodePatchProperty,
      nodeId: "summary",
      property: "text"
    },
    schemaVersion: UiDerivedRuleSchemaVersion.Version1,
    version: "1.0.0"
  };
}

function mutablePort(initial: Readonly<Record<string, JsonValue>>): RuleEvaluationPort {
  const state = new Map(Object.entries(initial));
  return {
    apply(command) {
      applyCommand(command, state);
    },
    read(dependency) {
      return state.get(key(dependency));
    }
  };
}

function applyCommand(command: UiCommand, state: Map<string, JsonValue>): void {
  if (command.type === UiCommandType.ControlSetDisabled) {
    state.set(key({ nodeId: command.id, pointer: "/base/disabled" }), command.disabled);
  }
  if (command.type === UiCommandType.NodePatchProperties) {
    Object.entries(command.properties).forEach(([property, value]) =>
      state.set(key({ nodeId: command.id, pointer: `/properties/${property}` }), value ?? null)
    );
  }
}

function key(dependency: RuleDependency): string {
  return JSON.stringify([dependency.nodeId, dependency.pointer]);
}
