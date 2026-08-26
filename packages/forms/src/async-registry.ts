import type { UiNodeSnapshot, UiValidationError } from "@unislang/unifold-events";

import type {
  UiAsyncValidator,
  UiAsyncValidatorRegistryPort,
  UiValidationContext
} from "./types.js";
import { ownValidationErrors } from "./error-ownership.js";

export class UiAsyncValidatorRegistry implements UiAsyncValidatorRegistryPort {
  private readonly validators = new Map<string, UiAsyncValidator>();

  register(id: string, validator: UiAsyncValidator): () => void {
    if (this.validators.has(id)) throw new Error(`Async validator is already registered: ${id}.`);
    this.validators.set(id, validator);
    return () => this.validators.delete(id);
  }

  async validate(node: UiNodeSnapshot, signal: AbortSignal): Promise<readonly UiValidationError[]> {
    const control = node.control;
    if (control === undefined) return [];
    const context: UiValidationContext = { node, value: control.value };
    const results = await Promise.all(
      control.asyncValidatorIds.map((id) => this.require(id).validate(context, signal))
    );
    return ownValidationErrors(node.id, results.flat());
  }

  private require(id: string): UiAsyncValidator {
    const validator = this.validators.get(id);
    if (validator === undefined) throw new Error(`Unknown async validator: ${id}.`);
    return validator;
  }
}

export function createAsyncValidatorRegistry(): UiAsyncValidatorRegistry {
  return new UiAsyncValidatorRegistry();
}
