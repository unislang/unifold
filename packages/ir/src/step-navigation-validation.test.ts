import {
  CatalogConstraintKind,
  type CatalogStepNavigationStateConstraint
} from "@unislang/unifold-catalog";
import { expect, it } from "vitest";

import { DiagnosticCode } from "./enums.js";
import {
  isWorkflowStepList,
  validateStepNavigationStateConstraint
} from "./step-navigation-validation.js";
import type { CompilerDiagnostic } from "./types.js";

const wizardConstraint: CatalogStepNavigationStateConstraint = {
  childMode: "match-steps",
  kind: CatalogConstraintKind.StepNavigationState,
  stepsProperty: "steps",
  valueProperty: "value"
};

it("accepts a bounded exact step list and one matching Wizard panel per step", () => {
  expect(isWorkflowStepList(steps())).toBe(true);
  expect(validateNode(wizardConstraint)).toEqual([]);
});

it("rejects malformed, oversized, unsafe, and extra workflow-step data", () => {
  expect(isWorkflowStepList([])).toBe(false);
  expect(isWorkflowStepList(Array.from({ length: 101 }, (_, index) => step(String(index))))).toBe(
    false
  );
  expect(isWorkflowStepList([{ id: "__proto__", label: "Unsafe" }])).toBe(false);
  expect(isWorkflowStepList([{ id: "x", label: "X", secret: "leak" }])).toBe(false);
});

it("reports duplicate, unknown, disabled, child-count, and leaf-child failures", () => {
  expect(
    codes(validateNode(wizardConstraint, { steps: [step("account"), step("account")] }))
  ).toEqual([DiagnosticCode.DuplicateStepId]);
  expect(codes(validateNode(wizardConstraint, { value: "missing" }))).toEqual([
    DiagnosticCode.UnknownStepSelection
  ]);
  expect(
    codes(validateNode(wizardConstraint, { steps: [step("account", true), step("review")] }))
  ).toEqual([DiagnosticCode.DisabledStepSelection]);
  expect(codes(validateNode(wizardConstraint, { $children: [{}] }))).toEqual([
    DiagnosticCode.StepChildCountMismatch
  ]);
  expect(codes(validateNode({ ...wizardConstraint, childMode: "none" }))).toEqual([
    DiagnosticCode.UnexpectedStepChildren
  ]);
});

function validateNode(
  constraint: CatalogStepNavigationStateConstraint,
  changes: Readonly<Record<string, unknown>> = {}
): CompilerDiagnostic[] {
  const diagnostics: CompilerDiagnostic[] = [];
  validateStepNavigationStateConstraint(
    { $children: [{}, {}], id: "workflow", steps: steps(), value: "account", ...changes },
    constraint,
    "/view",
    diagnostics
  );
  return diagnostics;
}

function steps() {
  return [step("account"), step("review")];
}

function step(id: string, disabled = false) {
  return { description: `Description ${id}`, disabled, id, label: `Step ${id}` };
}

function codes(diagnostics: readonly CompilerDiagnostic[]): readonly DiagnosticCode[] {
  return diagnostics.map(({ code }) => code);
}
