import type { JsonObject } from "@unislang/unifold-contracts";
import {
  UiCommandType,
  UiControlStatus,
  UiEventType,
  type FormResetCommand,
  type FormSubmitCommand,
  type UiCommand,
  type UiNodeSnapshot,
  type UiValidationError
} from "@unislang/unifold-events";

interface FormResultEvent {
  readonly change: JsonObject;
  readonly snapshot: UiNodeSnapshot;
  readonly type: UiEventType.FormInvalid | UiEventType.FormReset | UiEventType.FormSubmitted;
}

export function isFormResultCommand(
  command: UiCommand
): command is FormResetCommand | FormSubmitCommand {
  return command.type === UiCommandType.FormReset || command.type === UiCommandType.FormSubmit;
}

export function createFormResult(
  command: UiCommand,
  snapshot: UiNodeSnapshot
): FormResultEvent | undefined {
  if (command.type === UiCommandType.FormReset) return resetResult(snapshot);
  return submitResult(command, snapshot);
}

function resetResult(snapshot: UiNodeSnapshot): FormResultEvent {
  return { change: formValues(snapshot), snapshot, type: UiEventType.FormReset };
}

function submitResult(command: UiCommand, snapshot: UiNodeSnapshot): FormResultEvent | undefined {
  if (command.type !== UiCommandType.FormSubmit) return undefined;
  const control = requireFormControl(snapshot);
  return control.status === UiControlStatus.Invalid
    ? { change: invalidChange(control.errors), snapshot, type: UiEventType.FormInvalid }
    : { change: formValues(snapshot), snapshot, type: UiEventType.FormSubmitted };
}

function formValues(snapshot: UiNodeSnapshot): JsonObject {
  return { values: requireFormControl(snapshot).value };
}

function requireFormControl(snapshot: UiNodeSnapshot) {
  const control = snapshot.control;
  if (control === undefined) throw new Error(`Form control is missing: ${snapshot.id}.`);
  return control;
}

function invalidChange(errors: readonly UiValidationError[]): JsonObject {
  return { errors: errors.map(serializedError) };
}

function serializedError(error: UiValidationError): JsonObject {
  return {
    affectedIds: error.affectedIds ?? [],
    code: error.code,
    messageKey: error.messageKey,
    ...serializedOwner(error),
    parameters: error.parameters ?? {},
    severity: error.severity,
    validatorId: error.validatorId
  };
}

function serializedOwner(error: UiValidationError): JsonObject {
  return error.ownerId === undefined ? {} : { ownerId: error.ownerId };
}
