import type { UiNodeSnapshot, UiValidationError } from "@unislang/unifold-events";

import { requiredErrors } from "./required-validator.js";
import { numberConstraintErrors } from "./number-constraints.js";
import { ownValidationErrors } from "./error-ownership.js";
import type { UiValidationContext, UiValidator, UiValidatorRegistryPort } from "./types.js";

export class UiValidatorRegistry implements UiValidatorRegistryPort {
  private readonly validators = new Map<string, UiValidator>();

  register(id: string, validator: UiValidator): () => void {
    if (this.validators.has(id)) throw new Error(`Validator is already registered: ${id}.`);
    this.validators.set(id, validator);
    return () => this.validators.delete(id);
  }

  validate(node: UiNodeSnapshot): readonly UiValidationError[] {
    const control = node.control;
    if (control === undefined) return [];
    const context: UiValidationContext = { node, value: control.value };
    const errors = [
      ...requiredErrors(node),
      ...numberConstraintErrors(node),
      ...control.validatorIds.flatMap((id) => this.require(id).validate(context))
    ];
    return ownValidationErrors(node.id, errors);
  }

  private require(id: string): UiValidator {
    const validator = this.validators.get(id);
    if (validator === undefined) throw new Error(`Unknown validator: ${id}.`);
    return validator;
  }
}

export function createValidatorRegistry(): UiValidatorRegistry {
  return new UiValidatorRegistry();
}
