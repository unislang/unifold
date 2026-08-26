import type { UiValidationError } from "@unislang/unifold-events";

export function ownValidationErrors(
  ownerId: string,
  errors: readonly UiValidationError[]
): readonly UiValidationError[] {
  return errors.map((error) => ({ ...error, ownerId }));
}
