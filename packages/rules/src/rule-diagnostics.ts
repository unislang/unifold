import { RuleDiagnosticCode } from "./enums.js";
import type { RuleDiagnostic } from "./types.js";

export function prefixRuleDiagnostics(
  diagnostics: readonly RuleDiagnostic[],
  index: number
): RuleDiagnostic[] {
  return diagnostics.map((diagnostic) => ({
    ...diagnostic,
    path: `/rules/${index}${diagnostic.path}`
  }));
}

export function addRuleCountBudgetDiagnostic(diagnostics: RuleDiagnostic[]): void {
  diagnostics.push({
    code: RuleDiagnosticCode.BudgetExceeded,
    message: "Rule count budget exceeded.",
    path: "/rules"
  });
}
