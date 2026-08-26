import {
  UiDerivedRuleOutputKind,
  UiDerivedRuleSchemaVersion,
  UiNodeKind,
  type UiDerivedRuleDefinition
} from "@unislang/unifold-contracts";
import { expect, it } from "vitest";

import { compileDerivedRules } from "./compiler.js";
import { RuleCompilationStatus, RuleDiagnosticCode } from "./enums.js";

const nodes = [
  { id: "age", kind: UiNodeKind.Control },
  { id: "submit", kind: UiNodeKind.Control },
  { id: "summary", kind: UiNodeKind.Component }
];

it("compiles deterministic rule indexes and topological layers", () => {
  const disable = rule(
    "disable-submit",
    "age",
    "submit",
    UiDerivedRuleOutputKind.ControlSetDisabled
  );
  const summary = propertyRule("summarize", "submit", "/base/disabled", "summary", "state");
  const result = compileDerivedRules([summary, disable], nodes);
  expect(result.status).toBe(RuleCompilationStatus.Valid);
  expect(result.program?.rules.map(({ definition, layer }) => [definition.id, layer])).toEqual([
    ["disable-submit", 0],
    ["summarize", 1]
  ]);
  expect(result.program?.rulesByNodeId.get("age")).toEqual(["disable-submit"]);
});

it("rejects unknown nodes, undeclared reads, unused inputs, and non-control targets", () => {
  const unknown = rule("unknown", "missing", "submit", UiDerivedRuleOutputKind.ControlSetValue);
  const undeclared = {
    ...rule("undeclared", "age", "submit", UiDerivedRuleOutputKind.ControlSetValue),
    expression: { var: "secret" }
  };
  const wrongTarget = rule(
    "wrong-target",
    "age",
    "summary",
    UiDerivedRuleOutputKind.ControlSetDisabled
  );
  const codes = compileDerivedRules([unknown, undeclared, wrongTarget], nodes).diagnostics.map(
    ({ code }) => code
  );
  expect(codes).toContain(RuleDiagnosticCode.UnknownNode);
  expect(codes).toContain(RuleDiagnosticCode.UndeclaredInput);
  expect(codes).toContain(RuleDiagnosticCode.UnusedInput);
  expect(codes).toContain(RuleDiagnosticCode.InvalidOutput);
});

function rule(
  id: string,
  inputNodeId: string,
  outputNodeId: string,
  kind: UiDerivedRuleOutputKind.ControlSetDisabled | UiDerivedRuleOutputKind.ControlSetValue
): UiDerivedRuleDefinition {
  return {
    expression: { var: "input" },
    id,
    inputs: [{ name: "input", nodeId: inputNodeId, pointer: "/control/value" }],
    output: { kind, nodeId: outputNodeId },
    schemaVersion: UiDerivedRuleSchemaVersion.Version1,
    version: "1.0.0"
  };
}

function propertyRule(
  id: string,
  inputNodeId: string,
  pointer: string,
  outputNodeId: string,
  property: string
): UiDerivedRuleDefinition {
  return {
    expression: { var: "input" },
    id,
    inputs: [{ name: "input", nodeId: inputNodeId, pointer }],
    output: { kind: UiDerivedRuleOutputKind.NodePatchProperty, nodeId: outputNodeId, property },
    schemaVersion: UiDerivedRuleSchemaVersion.Version1,
    version: "1.0.0"
  };
}
