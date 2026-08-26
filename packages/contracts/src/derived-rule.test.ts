import { Ajv2020 } from "ajv/dist/2020.js";
import { expect, it } from "vitest";

import schema from "../schemas/derived-rule.schema.json" with { type: "json" };

import {
  UiDerivedRuleOutputKind,
  UiDerivedRuleSchemaVersion,
  type UiDerivedRuleDefinition
} from "./derived-rule.js";

it("defines enum-backed, JSON-safe derived rule outputs", () => {
  const rule: UiDerivedRuleDefinition = {
    expression: { ">=": [{ var: "age" }, 18] },
    id: "adult-access",
    inputs: [{ name: "age", nodeId: "age", pointer: "/control/value" }],
    output: {
      kind: UiDerivedRuleOutputKind.ControlSetDisabled,
      nodeId: "restricted-content"
    },
    schemaVersion: UiDerivedRuleSchemaVersion.Version1,
    version: "1.0.0"
  };

  expect(rule.schemaVersion).toBe("1.0.0");
  expect(Object.values(UiDerivedRuleOutputKind)).toEqual([
    "control-set-disabled",
    "control-set-value",
    "node-patch-property"
  ]);
  expect(new Ajv2020({ strict: true }).compile(schema)(rule)).toBe(true);
});
