import {
  UiDerivedRuleOutputKind,
  UiDerivedRuleSchemaVersion,
  type UiDerivedRuleDefinition
} from "@unislang/unifold-contracts";
import { expect, it } from "vitest";

import { buildRuleDependencyGraph, type RuleGraphSeed } from "./dependency-graph.js";
import { RuleDiagnosticCode } from "./enums.js";

it("orders reachable producers before consumers", () => {
  const first = seed(rule("first", "source", "middle"), "source", "middle");
  const second = seed(rule("second", "middle", "target"), "middle", "target");
  const result = buildRuleDependencyGraph([second, first]);
  expect(result.diagnostics).toEqual([]);
  expect(result.layerByRuleId.get("first")).toBe(0);
  expect(result.layerByRuleId.get("second")).toBe(1);
});

it("rejects cycles and ambiguous writers", () => {
  const first = seed(rule("first", "second", "same"), "second", "same");
  const second = seed(rule("second", "same", "second"), "same", "second");
  const duplicate = seed(rule("duplicate", "other", "same"), "other", "same");
  const codes = buildRuleDependencyGraph([first, second, duplicate]).diagnostics.map(
    ({ code }) => code
  );
  expect(codes).toContain(RuleDiagnosticCode.Cycle);
  expect(codes).toContain(RuleDiagnosticCode.MultipleWriters);
});

it("indexes a thousand independent rules without pairwise graph scanning", () => {
  const seeds = Array.from({ length: 1_000 }, (_, index) =>
    seed(
      rule(`rule-${index}`, `input-${index}`, `output-${index}`),
      `input-${index}`,
      `output-${index}`
    )
  );
  const result = buildRuleDependencyGraph(seeds);
  expect(result.diagnostics).toEqual([]);
  expect(result.layerByRuleId.size).toBe(1_000);
});

function seed(
  definition: UiDerivedRuleDefinition,
  inputNodeId: string,
  outputNodeId: string
): RuleGraphSeed {
  return {
    definition,
    inputs: [{ nodeId: inputNodeId, pointer: "/properties/value" }],
    outputs: [{ nodeId: outputNodeId, pointer: "/properties/value" }],
    primaryOutput: { nodeId: outputNodeId, pointer: "/properties/value" },
    referencedInputs: ["input"]
  };
}

function rule(id: string, inputNodeId: string, outputNodeId: string): UiDerivedRuleDefinition {
  return {
    expression: { var: "input" },
    id,
    inputs: [{ name: "input", nodeId: inputNodeId, pointer: "/properties/value" }],
    output: {
      kind: UiDerivedRuleOutputKind.NodePatchProperty,
      nodeId: outputNodeId,
      property: "value"
    },
    schemaVersion: UiDerivedRuleSchemaVersion.Version1,
    version: "1.0.0"
  };
}
