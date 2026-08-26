import { UiNodeKind } from "@unislang/unifold-contracts";
import { expect, it } from "vitest";

import { RuleDiagnosticCode } from "./enums.js";
import { createRuleValidationContext, validateRuleCollection } from "./rule-validation.js";

it("resolves budgets and rejects duplicate rule IDs at the collection boundary", () => {
  const context = createRuleValidationContext([{ id: "node", kind: UiNodeKind.Component }], {
    maxRules: 1
  });
  const rule = { id: "same" } as never;
  validateRuleCollection([rule, rule], context);
  expect(context.limits.maxExpressionDepth).toBe(32);
  expect(context.diagnostics.map(({ code }) => code)).toEqual([
    RuleDiagnosticCode.BudgetExceeded,
    RuleDiagnosticCode.DuplicateRuleId
  ]);
});
