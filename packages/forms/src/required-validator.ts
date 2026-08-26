import { UiValidationSeverity, type UiNodeSnapshot } from "@unislang/unifold-events";

import { BuiltInValidatorId, ValidationErrorCode, ValidationMessageKey } from "./enums.js";

const emptyScalars: ReadonlySet<unknown> = new Set([null, "", false]);

export function requiredErrors(node: UiNodeSnapshot) {
  if (!requiresValue(node)) return [];
  if (!emptyValue(requiredValue(node))) return [];
  return [
    {
      affectedIds: [node.id],
      code: ValidationErrorCode.Required,
      messageKey: ValidationMessageKey.Required,
      severity: UiValidationSeverity.Error,
      validatorId: BuiltInValidatorId.Required
    }
  ];
}

function requiresValue(node: UiNodeSnapshot): boolean {
  return node.control?.required === true;
}

function requiredValue(node: UiNodeSnapshot): unknown {
  const control = node.control;
  if (control === undefined) throw new Error(`Required control is missing: ${node.id}.`);
  return control.value;
}

function emptyValue(value: unknown): boolean {
  if (emptyScalars.has(value)) return true;
  return Array.isArray(value) && value.length === 0;
}
