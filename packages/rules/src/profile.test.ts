import { expect, it } from "vitest";

import { RuleDiagnosticCode } from "./enums.js";
import { analyzeJsonLogicExpression } from "./profile.js";

const limits = { maxDepth: 8, maxNodes: 32 };

it("extracts only declared var aliases from allowlisted JSON Logic", () => {
  const result = analyzeJsonLogicExpression(
    { and: [{ ">=": [{ var: "age" }, 18] }, { var: "accepted" }] },
    new Set(["accepted", "age"]),
    "eligibility",
    limits
  );
  expect(result.diagnostics).toEqual([]);
  expect(result.referencedInputs).toEqual(["accepted", "age"]);
});

it("rejects unknown operators, undeclared reads, arity errors, and budgets", () => {
  const unknown = analyzeJsonLogicExpression({ fetch: ["url"] }, new Set(), "unsafe", limits);
  const undeclared = analyzeJsonLogicExpression({ var: "secret" }, new Set(), "unsafe", limits);
  const arity = analyzeJsonLogicExpression({ ">": [1] }, new Set(), "unsafe", limits);
  const budget = analyzeJsonLogicExpression([1, 2], new Set(), "unsafe", {
    ...limits,
    maxNodes: 1
  });
  expect(unknown.diagnostics.map(({ code }) => code)).toContain(RuleDiagnosticCode.UnknownOperator);
  expect(undeclared.diagnostics.map(({ code }) => code)).toContain(
    RuleDiagnosticCode.UndeclaredInput
  );
  expect(arity.diagnostics.map(({ code }) => code)).toContain(RuleDiagnosticCode.InvalidExpression);
  expect(budget.diagnostics.map(({ code }) => code)).toContain(RuleDiagnosticCode.BudgetExceeded);
});
