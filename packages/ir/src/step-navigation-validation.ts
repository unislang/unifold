import {
  CatalogConstraintKind,
  type CatalogConstraintDescriptor,
  type CatalogStepNavigationStateConstraint,
  type WorkflowStep
} from "@unislang/unifold-catalog";

import { errorDiagnostic } from "./diagnostics.js";
import { DiagnosticCode } from "./enums.js";
import { isPlainObject } from "./json-safety.js";
import { isTableIdentifier } from "./table-data-validation.js";
import type { CompilerDiagnostic } from "./types.js";

const MAX_STEPS = 100;
const MAX_LABEL = 512;
const MAX_DESCRIPTION = 4_096;
const stepKeys = new Set(["description", "disabled", "id", "label"]);

interface NavigationTerms {
  readonly childMismatch: (count: number) => string;
  readonly disabledCode: DiagnosticCode;
  readonly duplicateCode: DiagnosticCode;
  readonly itemName: string;
  readonly unknownCode: DiagnosticCode;
}

const termsByOwner: Readonly<
  Record<CatalogStepNavigationStateConstraint["owner"], NavigationTerms>
> = {
  stepper: stepTerms("Stepper"),
  tabs: {
    childMismatch: (count) => `Tabs requires one child panel for each of its ${count} tabs.`,
    disabledCode: DiagnosticCode.DisabledTabSelection,
    duplicateCode: DiagnosticCode.DuplicateTabId,
    itemName: "tab",
    unknownCode: DiagnosticCode.UnknownTabSelection
  },
  wizard: stepTerms("Wizard")
};

export function isWorkflowStepList(value: unknown): value is readonly WorkflowStep[] {
  if (!Array.isArray(value)) return false;
  return validStepCount(value.length) && value.every(isWorkflowStep);
}

function validStepCount(count: number): boolean {
  return count > 0 && count <= MAX_STEPS;
}

export function validateStepNavigationStateConstraint(
  node: Readonly<Record<string, unknown>>,
  constraint: CatalogConstraintDescriptor,
  path: string,
  diagnostics: CompilerDiagnostic[]
): void {
  if (constraint.kind !== CatalogConstraintKind.StepNavigationState) return;
  const steps = node[constraint.stepsProperty];
  if (!isWorkflowStepList(steps)) return;
  reportDuplicateSteps(steps, constraint, nodeId(node), path, diagnostics);
  reportSelection(
    steps,
    node[constraint.valueProperty],
    constraint,
    nodeId(node),
    path,
    diagnostics
  );
  reportChildren(node["$children"], steps.length, constraint, nodeId(node), path, diagnostics);
}

function isWorkflowStep(value: unknown): value is WorkflowStep {
  if (!isPlainObject(value)) return false;
  return [
    Object.keys(value).every((key) => stepKeys.has(key)),
    isTableIdentifier(value["id"]),
    nonEmptyString(value["label"], MAX_LABEL),
    optionalString(value["description"], MAX_DESCRIPTION),
    value["disabled"] === undefined || typeof value["disabled"] === "boolean"
  ].every(Boolean);
}

function nonEmptyString(value: unknown, maximum: number): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= maximum;
}

function optionalString(value: unknown, maximum: number): boolean {
  return value === undefined || (typeof value === "string" && value.length <= maximum);
}

function reportDuplicateSteps(
  steps: readonly WorkflowStep[],
  constraint: CatalogStepNavigationStateConstraint,
  id: string | undefined,
  path: string,
  diagnostics: CompilerDiagnostic[]
): void {
  const terms = termsByOwner[constraint.owner];
  const seen = new Set<string>();
  steps.forEach((step, index) => {
    if (seen.has(step.id)) {
      diagnostics.push(
        errorDiagnostic(
          terms.duplicateCode,
          `${capitalized(terms.itemName)} id "${step.id}" is already defined.`,
          `${path}/${constraint.stepsProperty}/${index}/id`,
          id
        )
      );
    }
    seen.add(step.id);
  });
}

function reportSelection(
  steps: readonly WorkflowStep[],
  value: unknown,
  constraint: CatalogStepNavigationStateConstraint,
  id: string | undefined,
  path: string,
  diagnostics: CompilerDiagnostic[]
): void {
  if (typeof value === "string") {
    reportStringSelection(steps, value, constraint, id, path, diagnostics);
  }
}

function reportStringSelection(
  steps: readonly WorkflowStep[],
  value: string,
  constraint: CatalogStepNavigationStateConstraint,
  id: string | undefined,
  path: string,
  diagnostics: CompilerDiagnostic[]
): void {
  const step = steps.find(({ id: stepId }) => stepId === value);
  const selectionPath = `${path}/${constraint.valueProperty}`;
  if (step === undefined) {
    reportUnknownSelection(value, selectionPath, id, diagnostics, constraint);
    return;
  }
  if (step.disabled === true) {
    reportDisabledSelection(value, selectionPath, id, diagnostics, constraint);
  }
}

function reportUnknownSelection(
  value: string,
  path: string,
  id: string | undefined,
  diagnostics: CompilerDiagnostic[],
  constraint: CatalogStepNavigationStateConstraint
): void {
  const terms = termsByOwner[constraint.owner];
  diagnostics.push(
    errorDiagnostic(
      terms.unknownCode,
      `Selected ${terms.itemName} "${value}" is not declared.`,
      path,
      id
    )
  );
}

function reportDisabledSelection(
  value: string,
  path: string,
  id: string | undefined,
  diagnostics: CompilerDiagnostic[],
  constraint: CatalogStepNavigationStateConstraint
): void {
  const terms = termsByOwner[constraint.owner];
  diagnostics.push(
    errorDiagnostic(
      terms.disabledCode,
      `Selected ${terms.itemName} "${value}" is disabled.`,
      path,
      id
    )
  );
}

function reportChildren(
  value: unknown,
  stepCount: number,
  constraint: CatalogStepNavigationStateConstraint,
  id: string | undefined,
  path: string,
  diagnostics: CompilerDiagnostic[]
): void {
  const childCount = arrayLength(value);
  if (constraint.childMode === "none") {
    reportUnexpectedChildren(childCount, id, path, diagnostics);
    return;
  }
  reportChildCountMismatch(childCount, stepCount, constraint, id, path, diagnostics);
}

function reportUnexpectedChildren(
  childCount: number,
  id: string | undefined,
  path: string,
  diagnostics: CompilerDiagnostic[]
): void {
  if (childCount === 0) return;
  diagnostics.push(
    errorDiagnostic(
      DiagnosticCode.UnexpectedStepChildren,
      "Stepper cannot contain authored child panels.",
      `${path}/$children`,
      id
    )
  );
}

function reportChildCountMismatch(
  childCount: number,
  stepCount: number,
  constraint: CatalogStepNavigationStateConstraint,
  id: string | undefined,
  path: string,
  diagnostics: CompilerDiagnostic[]
): void {
  if (childCount === stepCount) return;
  diagnostics.push(
    errorDiagnostic(
      childMismatchCode(constraint),
      termsByOwner[constraint.owner].childMismatch(stepCount),
      `${path}/$children`,
      id
    )
  );
}

function stepTerms(owner: "Stepper" | "Wizard"): NavigationTerms {
  return {
    childMismatch: (count) => `${owner} requires one child panel for each of its ${count} steps.`,
    disabledCode: DiagnosticCode.DisabledStepSelection,
    duplicateCode: DiagnosticCode.DuplicateStepId,
    itemName: "workflow step",
    unknownCode: DiagnosticCode.UnknownStepSelection
  };
}

function childMismatchCode(constraint: CatalogStepNavigationStateConstraint): DiagnosticCode {
  return constraint.owner === "tabs"
    ? DiagnosticCode.TabChildCountMismatch
    : DiagnosticCode.StepChildCountMismatch;
}

function capitalized(value: string): string {
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}

function arrayLength(value: unknown): number {
  return Array.isArray(value) ? value.length : 0;
}

function nodeId(node: Readonly<Record<string, unknown>>): string | undefined {
  return typeof node["id"] === "string" ? node["id"] : undefined;
}
