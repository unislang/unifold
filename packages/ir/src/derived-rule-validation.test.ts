import {
  UiDerivedRuleOutputKind,
  UiDerivedRuleSchemaVersion,
  type UiDerivedRuleDefinition,
  type UiDocument
} from "@unislang/unifold-contracts";
import { expect, it } from "vitest";

import { composedDocument } from "./composition-validation.test-data.js";
import { DiagnosticCode } from "./enums.js";
import { compileUiDocument } from "./compiler.js";

it("validates and preserves a canonical derived-rule definition", () => {
  const document = withRules(propertyRule("summary", "editor::name", "value", "editor", "summary"));
  const result = compileUiDocument(document);
  expect(result.diagnostics).toEqual([]);
  expect(result.document?.rules[0]?.id).toBe("summary");
});

it("rejects unknown operators and dependency cycles through compiler diagnostics", () => {
  const unsafe = {
    ...propertyRule("unsafe", "editor::name", "value", "editor", "summary"),
    expression: { fetch: ["https://example.com"] }
  } as UiDerivedRuleDefinition;
  const cycle = withRules(
    propertyRule("first", "editor", "second", "editor", "first"),
    propertyRule("second", "editor", "first", "editor", "second")
  );
  expect(codes(withRules(unsafe))).toContain(DiagnosticCode.InvalidDerivedRule);
  expect(codes(cycle)).toContain(DiagnosticCode.DerivedRuleCycle);
});

function withRules(...rules: UiDerivedRuleDefinition[]): UiDocument {
  return { ...composedDocument(), rules };
}

function propertyRule(
  id: string,
  inputNodeId: string,
  inputProperty: string,
  outputNodeId: string,
  outputProperty: string
): UiDerivedRuleDefinition {
  return {
    expression: { var: "input" },
    id,
    inputs: [{ name: "input", nodeId: inputNodeId, pointer: `/properties/${inputProperty}` }],
    output: {
      kind: UiDerivedRuleOutputKind.NodePatchProperty,
      nodeId: outputNodeId,
      property: outputProperty
    },
    schemaVersion: UiDerivedRuleSchemaVersion.Version1,
    version: "1.0.0"
  };
}

function codes(document: UiDocument): DiagnosticCode[] {
  return compileUiDocument(document).diagnostics.map(({ code }) => code);
}
