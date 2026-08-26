import {
  CoreComponentType,
  JSON_NUMBER_MAXIMUM_ISSUE,
  JSON_NUMBER_MINIMUM_ISSUE,
  JSON_NUMBER_STEP_ISSUE,
  isFiniteJsonNumber,
  jsonNumberConstraintIssue,
  type JsonNumberConstraintIssue,
  type JsonObject
} from "@unislang/unifold-contracts";
import {
  UiValidationSeverity,
  type UiNodeSnapshot,
  type UiValidationError
} from "@unislang/unifold-events";

import { BuiltInValidatorId, ValidationErrorCode, ValidationMessageKey } from "./enums.js";

const issueDefinitions: Partial<
  Record<JsonNumberConstraintIssue, readonly [ValidationErrorCode, ValidationMessageKey]>
> = {
  [JSON_NUMBER_MAXIMUM_ISSUE]: [
    ValidationErrorCode.NumberMaximum,
    ValidationMessageKey.NumberMaximum
  ],
  [JSON_NUMBER_MINIMUM_ISSUE]: [
    ValidationErrorCode.NumberMinimum,
    ValidationMessageKey.NumberMinimum
  ],
  [JSON_NUMBER_STEP_ISSUE]: [ValidationErrorCode.NumberStep, ValidationMessageKey.NumberStep]
};

export function numberConstraintErrors(node: UiNodeSnapshot): readonly UiValidationError[] {
  if (node.type !== CoreComponentType.NumberField) return [];
  return controlNumberErrors(node);
}

function controlNumberErrors(node: UiNodeSnapshot): readonly UiValidationError[] {
  const value = controlValue(node);
  if (value === null) return [];
  if (!isFiniteJsonNumber(value)) return [];
  return numberIssueErrors(node, value);
}

function controlValue(node: UiNodeSnapshot): unknown {
  if (node.control === undefined) return undefined;
  return node.control.value;
}

function numberIssueErrors(node: UiNodeSnapshot, value: number): readonly UiValidationError[] {
  const issue = jsonNumberConstraintIssue(
    value,
    numberProperty(node.properties, "min"),
    numberProperty(node.properties, "max"),
    numberOr(numberProperty(node.properties, "step"), 1)
  );
  if (issue === undefined) return [];
  return definedIssueErrors(node.id, issueDefinitions[issue]);
}

function definedIssueErrors(
  id: string,
  definition: readonly [ValidationErrorCode, ValidationMessageKey] | undefined
): readonly UiValidationError[] {
  if (definition === undefined) return [];
  return [error(id, definition)];
}

function error(
  id: string,
  definition: readonly [ValidationErrorCode, ValidationMessageKey]
): UiValidationError {
  return {
    affectedIds: [id],
    code: definition[0],
    messageKey: definition[1],
    severity: UiValidationSeverity.Error,
    validatorId: BuiltInValidatorId.NumberConstraints
  };
}

function numberProperty(properties: JsonObject, name: string): number | null {
  const value = properties[name];
  return isFiniteJsonNumber(value) ? value : null;
}

function numberOr(value: number | null, fallback: number): number {
  return value === null ? fallback : value;
}
