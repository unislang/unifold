import {
  CatalogConstraintKind,
  type CatalogConstraintDescriptor,
  type CatalogDateFieldRangeConstraint
} from "@unislang/unifold-catalog";
import {
  JsonDateConstraintIssue,
  isJsonDateValue,
  jsonDateConstraintIssue
} from "@unislang/unifold-contracts";

import { errorDiagnostic } from "./diagnostics.js";
import { DiagnosticCode } from "./enums.js";
import type { CompilerDiagnostic } from "./types.js";

interface DateIssueDefinition {
  readonly message: string;
  readonly property: DateIssueProperty;
}

enum DateIssueProperty {
  Maximum = "maximum",
  Minimum = "minimum",
  Value = "value"
}

const issueDefinitions: Readonly<Record<JsonDateConstraintIssue, DateIssueDefinition>> = {
  [JsonDateConstraintIssue.Maximum]: {
    message: "Value is after the declared maximum date.",
    property: DateIssueProperty.Value
  },
  [JsonDateConstraintIssue.Minimum]: {
    message: "Value is before the declared minimum date.",
    property: DateIssueProperty.Value
  },
  [JsonDateConstraintIssue.Range]: {
    message: "Maximum date must be greater than or equal to minimum date.",
    property: DateIssueProperty.Maximum
  },
  [JsonDateConstraintIssue.Step]: {
    message: "Value does not align with the declared day step.",
    property: DateIssueProperty.Value
  },
  [JsonDateConstraintIssue.StepAnchor]: {
    message: "Minimum date is required when day step is greater than one.",
    property: DateIssueProperty.Minimum
  }
};

export function validateDateFieldRangeConstraint(
  node: Readonly<Record<string, unknown>>,
  descriptor: CatalogConstraintDescriptor,
  path: string,
  diagnostics: CompilerDiagnostic[]
): void {
  if (descriptor.kind !== CatalogConstraintKind.DateFieldRange) return;
  validateTypedDateFieldRange(node, descriptor, path, diagnostics);
}

function validateTypedDateFieldRange(
  node: Readonly<Record<string, unknown>>,
  descriptor: CatalogDateFieldRangeConstraint,
  path: string,
  diagnostics: CompilerDiagnostic[]
): void {
  const values = dateConstraintValues(node, descriptor);
  if (values === undefined) return;
  const issue = jsonDateConstraintIssue(...values);
  if (issue === undefined) return;
  addDiagnostic(node, descriptor, issueDefinitions[issue], path, diagnostics);
}

function dateConstraintValues(
  node: Readonly<Record<string, unknown>>,
  descriptor: CatalogDateFieldRangeConstraint
): readonly [string, string, string, number] | undefined {
  const values = [
    dateValue(node[descriptor.valueProperty]),
    dateValue(node[descriptor.minimumProperty]),
    dateValue(node[descriptor.maximumProperty]),
    positiveInteger(node[descriptor.stepProperty])
  ] as const;
  if (values.includes(undefined)) return undefined;
  return values as readonly [string, string, string, number];
}

function dateValue(value: unknown): string | undefined {
  if (value === undefined) return "";
  return isJsonDateValue(value) ? value : undefined;
}

function positiveInteger(value: unknown): number | undefined {
  if (value === undefined) return 1;
  return isPositiveInteger(value) ? value : undefined;
}

function isPositiveInteger(value: unknown): value is number {
  if (typeof value !== "number") return false;
  if (!Number.isSafeInteger(value)) return false;
  return value > 0;
}

function addDiagnostic(
  node: Readonly<Record<string, unknown>>,
  descriptor: CatalogDateFieldRangeConstraint,
  issue: DateIssueDefinition,
  path: string,
  diagnostics: CompilerDiagnostic[]
): void {
  const property = issuePropertyName(issue.property, descriptor);
  diagnostics.push(
    errorDiagnostic(
      DiagnosticCode.InvalidProperty,
      issue.message,
      `${path}/${property}`,
      typeof node["id"] === "string" ? node["id"] : undefined
    )
  );
}

function issuePropertyName(
  property: DateIssueProperty,
  descriptor: CatalogDateFieldRangeConstraint
): string {
  if (property === DateIssueProperty.Maximum) return descriptor.maximumProperty;
  if (property === DateIssueProperty.Minimum) return descriptor.minimumProperty;
  return descriptor.valueProperty;
}
