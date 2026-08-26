import {
  CatalogConstraintKind,
  type CatalogConstraintDescriptor,
  type CatalogNumberFieldRangeConstraint
} from "@unislang/unifold-catalog";
import {
  JSON_NUMBER_MAXIMUM_ISSUE,
  JSON_NUMBER_MINIMUM_ISSUE,
  JSON_NUMBER_RANGE_ISSUE,
  JSON_NUMBER_STEP_ISSUE,
  isFiniteJsonNumber,
  jsonNumberConstraintIssue,
  type JsonNumberConstraintIssue
} from "@unislang/unifold-contracts";

import { errorDiagnostic } from "./diagnostics.js";
import { DiagnosticCode } from "./enums.js";
import type { CompilerDiagnostic } from "./types.js";

interface NumberIssueDefinition {
  readonly message: string;
  readonly property: NumberIssueProperty;
}

enum NumberIssueProperty {
  Maximum = "maximum",
  Value = "value"
}

const issueDefinitions: Readonly<Record<JsonNumberConstraintIssue, NumberIssueDefinition>> = {
  [JSON_NUMBER_MAXIMUM_ISSUE]: {
    message: "Value is above the declared maximum.",
    property: NumberIssueProperty.Value
  },
  [JSON_NUMBER_MINIMUM_ISSUE]: {
    message: "Value is below the declared minimum.",
    property: NumberIssueProperty.Value
  },
  [JSON_NUMBER_RANGE_ISSUE]: {
    message: "Maximum must be greater than or equal to minimum.",
    property: NumberIssueProperty.Maximum
  },
  [JSON_NUMBER_STEP_ISSUE]: {
    message: "Value does not align with the declared step.",
    property: NumberIssueProperty.Value
  }
};

export function validateNumberFieldRangeConstraint(
  node: Readonly<Record<string, unknown>>,
  descriptor: CatalogConstraintDescriptor,
  path: string,
  diagnostics: CompilerDiagnostic[]
): void {
  if (descriptor.kind !== CatalogConstraintKind.NumberFieldRange) return;
  validateTypedNumberFieldRange(node, descriptor, path, diagnostics);
}

function validateTypedNumberFieldRange(
  node: Readonly<Record<string, unknown>>,
  descriptor: CatalogNumberFieldRangeConstraint,
  path: string,
  diagnostics: CompilerDiagnostic[]
): void {
  const values = numberConstraintValues(node, descriptor);
  if (values === undefined) return;
  const issue = jsonNumberConstraintIssue(...values);
  if (issue === undefined) return;
  addDiagnostic(node, descriptor, issueDefinitions[issue], path, diagnostics);
}

function numberConstraintValues(
  node: Readonly<Record<string, unknown>>,
  descriptor: CatalogNumberFieldRangeConstraint
): readonly [number | null, number | null, number | null, number] | undefined {
  const values = [
    nullableNumber(node[descriptor.valueProperty]),
    nullableNumber(node[descriptor.minimumProperty]),
    nullableNumber(node[descriptor.maximumProperty]),
    positiveNumber(node[descriptor.stepProperty])
  ] as const;
  if (values.includes(undefined)) return undefined;
  return values as readonly [number | null, number | null, number | null, number];
}

function nullableNumber(value: unknown): number | null | undefined {
  if ([undefined, null].includes(value as undefined | null)) return null;
  return isFiniteJsonNumber(value) ? value : undefined;
}

function positiveNumber(value: unknown): number | undefined {
  if (value === undefined) return 1;
  return definedPositiveNumber(value);
}

function definedPositiveNumber(value: unknown): number | undefined {
  if (!isFiniteJsonNumber(value)) return undefined;
  if (value <= 0) return undefined;
  return value;
}

function addDiagnostic(
  node: Readonly<Record<string, unknown>>,
  descriptor: CatalogNumberFieldRangeConstraint,
  issue: NumberIssueDefinition,
  path: string,
  diagnostics: CompilerDiagnostic[]
): void {
  const property =
    issue.property === NumberIssueProperty.Maximum
      ? descriptor.maximumProperty
      : descriptor.valueProperty;
  diagnostics.push(
    errorDiagnostic(
      DiagnosticCode.InvalidProperty,
      issue.message,
      `${path}/${property}`,
      typeof node["id"] === "string" ? node["id"] : undefined
    )
  );
}
