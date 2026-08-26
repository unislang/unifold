import { expect, it } from "vitest";

import { RuleDiagnosticCode } from "./enums.js";
import { addRuleCountBudgetDiagnostic, prefixRuleDiagnostics } from "./rule-diagnostics.js";
import type { RuleDiagnostic } from "./types.js";

it("creates and prefixes deterministic compiler diagnostics", () => {
  const diagnostics: RuleDiagnostic[] = [];
  addRuleCountBudgetDiagnostic(diagnostics);
  expect(diagnostics[0]?.code).toBe(RuleDiagnosticCode.BudgetExceeded);
  expect(prefixRuleDiagnostics(diagnostics, 2)[0]?.path).toBe("/rules/2/rules");
});
