import { expect, it } from "vitest";

import {
  JsonLogicOperator,
  RuleCompilationStatus,
  RuleDiagnosticCode,
  RuleEvaluationStatus
} from "./enums.js";

it("uses enum-backed public status and operator values", () => {
  expect(JsonLogicOperator.Variable).toBe("var");
  expect(RuleCompilationStatus.Valid).toBe("valid");
  expect(RuleDiagnosticCode.Cycle).toBe("cycle");
  expect(RuleEvaluationStatus.Applied).toBe("applied");
});
