import { UiValidationSeverity } from "@unislang/unifold-events";
import {
  createAsyncValidatorRegistry,
  createStandardSchemaValidator,
  createValidatorRegistry,
  type UiValidationContext
} from "@unislang/unifold-forms";
import { check, forward, looseObject, pipe, string } from "valibot";

export function profileValidators() {
  const registry = createValidatorRegistry();
  registry.register(
    "names-match",
    createStandardSchemaValidator(namesMatchSchema(), {
      affectedIdsByPath: { confirmName: ["profile-editor::confirm-name"] },
      code: "names-match",
      messageKey: "validation.names-match",
      validatorId: "names-match"
    })
  );
  return registry;
}

export function profileAsyncValidators() {
  const registry = createAsyncValidatorRegistry();
  registry.register("name-available", { validate: validateNameAvailability });
  return registry;
}

async function validateNameAvailability(context: UiValidationContext, signal: AbortSignal) {
  const unavailable = String(context.value).toLowerCase() === "taken";
  await abortableDelay(unavailable ? 1_000 : 10, signal);
  return unavailable ? [nameUnavailableError(context.node.id)] : [];
}

function nameUnavailableError(id: string) {
  return {
    affectedIds: [id],
    code: "name-unavailable",
    messageKey: "validation.name-unavailable",
    ownerId: id,
    parameters: { message: "This name is unavailable." },
    severity: UiValidationSeverity.Error,
    validatorId: "name-available"
  } as const;
}

function abortableDelay(milliseconds: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(resolve, milliseconds);
    signal.addEventListener("abort", () => abortDelay(timer, reject), { once: true });
  });
}

function abortDelay(timer: number, reject: (reason: DOMException) => void): void {
  window.clearTimeout(timer);
  reject(new DOMException("Validation was superseded.", "AbortError"));
}

function namesMatchSchema() {
  return pipe(
    looseObject({ confirmName: string(), name: string() }),
    forward(check(matchesOptionalConfirmation, "Names must match."), ["confirmName"])
  );
}

function matchesOptionalConfirmation(value: { confirmName: string; name: string }): boolean {
  if (value.confirmName.length === 0) return true;
  return value.confirmName === value.name;
}
