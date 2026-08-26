import type { JsonValue } from "@unislang/unifold-contracts";
import type {
  UiControlStatus,
  UiNodeSnapshot,
  UiValidationError,
  UiValidationSeverity
} from "@unislang/unifold-events";

export interface UiValidationContext {
  readonly node: UiNodeSnapshot;
  readonly value: JsonValue;
}

export interface UiValidator {
  validate(context: UiValidationContext): readonly UiValidationError[];
}

export interface UiValidatorRegistryPort {
  validate(node: UiNodeSnapshot): readonly UiValidationError[];
}

export interface UiAsyncValidator {
  validate(
    context: UiValidationContext,
    signal: AbortSignal
  ): Promise<readonly UiValidationError[]>;
}

export interface UiAsyncValidatorRegistryPort {
  validate(node: UiNodeSnapshot, signal: AbortSignal): Promise<readonly UiValidationError[]>;
}

export interface UiControlValidationResult {
  readonly errors: readonly UiValidationError[];
  readonly pending: boolean;
  readonly status: UiControlStatus;
  readonly validationRequestId: null;
}

export interface StandardSchemaValidatorOptions {
  readonly affectedIdsByPath?: Readonly<Record<string, readonly string[]>>;
  readonly code: string;
  readonly messageKey: string;
  readonly severity?: UiValidationSeverity;
  readonly validatorId: string;
}
