import { UiControlStatus, type UiNodeSnapshot } from "@unislang/unifold-events";

import type { UiControlValidationResult, UiValidatorRegistryPort } from "./types.js";

export function validateControl(
  node: UiNodeSnapshot,
  registry: UiValidatorRegistryPort
): UiControlValidationResult {
  if (node.control === undefined) throw new Error(`Node is not a control: ${node.id}.`);
  if (node.base.disabled) return disabledResult();
  const errors = registry.validate(node);
  return {
    errors,
    pending: false,
    status: validationStatus(errors.length),
    validationRequestId: null
  };
}

export function withValidatedControl(
  node: UiNodeSnapshot,
  registry: UiValidatorRegistryPort
): UiNodeSnapshot {
  if (node.control === undefined) return node;
  return { ...node, control: { ...node.control, ...validateControl(node, registry) } };
}

function disabledResult(): UiControlValidationResult {
  return {
    errors: [],
    pending: false,
    status: UiControlStatus.Disabled,
    validationRequestId: null
  };
}

function validationStatus(errorCount: number): UiControlStatus {
  return errorCount === 0 ? UiControlStatus.Valid : UiControlStatus.Invalid;
}
