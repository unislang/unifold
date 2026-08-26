import { UiValidationSeverity } from "@unislang/unifold-events";
import {
  createAsyncValidatorRegistry,
  createStandardSchemaValidator,
  createValidatorRegistry,
  type UiValidationContext
} from "@unislang/unifold-forms";

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
  return {
    "~standard": {
      validate: validateNamesMatch,
      vendor: "unifold",
      version: 1 as const
    }
  };
}

function validateNamesMatch(value: unknown) {
  const names = readNames(value);
  return namesMatch(names)
    ? { value }
    : { issues: [{ message: "Names must match.", path: ["confirmName"] }] };
}

function readNames(
  value: unknown
): { readonly confirmName: string; readonly name: string } | undefined {
  if (!isRecord(value)) return undefined;
  return readNameProperties(value);
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  if (typeof value !== "object") return false;
  if (value === null) return false;
  return !Array.isArray(value);
}

function readNameProperties(
  candidate: Readonly<Record<string, unknown>>
): { readonly confirmName: string; readonly name: string } | undefined {
  const confirmName = candidate["confirmName"];
  if (typeof confirmName !== "string") return undefined;
  const name = candidate["name"];
  return typeof name === "string" ? { confirmName, name } : undefined;
}

function namesMatch(
  names: { readonly confirmName: string; readonly name: string } | undefined
): boolean {
  if (names === undefined) return false;
  return names.confirmName === "" || names.confirmName === names.name;
}
