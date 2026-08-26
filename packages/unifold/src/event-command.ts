import type { JsonValue } from "@unislang/unifold-contracts";
import { ElementEventType } from "@unislang/unifold-elements";
import {
  UiCommandType,
  type ControlMarkTouchedCommand,
  type ControlSetValueCommand,
  type FormResetCommand,
  type FormSubmitCommand,
  type UiEvent
} from "@unislang/unifold-events";
import type { UiExecutionContext } from "@unislang/unifold-runtime";

type NodeCommandType =
  | UiCommandType.ControlMarkTouched
  | UiCommandType.FormReset
  | UiCommandType.FormSubmit;

interface NodeCommand<TType extends NodeCommandType> {
  readonly id: string;
  readonly type: TType;
}

export function commandForEvent(
  event: UiEvent
):
  | ControlMarkTouchedCommand
  | ControlSetValueCommand
  | FormResetCommand
  | FormSubmitCommand
  | undefined {
  if (event.type === ElementEventType.ControlInput) return controlValueCommand(event);
  return nonInputCommand(event);
}

export function eventExecutionContext(event: UiEvent): UiExecutionContext {
  return {
    causationId: event.id,
    correlationId: event.correlationid,
    transactionId: event.transactionid
  };
}

function nonInputCommand(
  event: UiEvent
): ControlMarkTouchedCommand | FormResetCommand | FormSubmitCommand | undefined {
  if (event.type === ElementEventType.ControlBlurred)
    return nodeCommand(event, UiCommandType.ControlMarkTouched);
  return formCommand(event);
}

function formCommand(event: UiEvent): FormResetCommand | FormSubmitCommand | undefined {
  if (event.type === ElementEventType.FormSubmitRequested)
    return nodeCommand(event, UiCommandType.FormSubmit);
  if (event.type === ElementEventType.FormResetRequested)
    return nodeCommand(event, UiCommandType.FormReset);
  return undefined;
}

function controlValueCommand(event: UiEvent): ControlSetValueCommand | undefined {
  const id = sourceId(event);
  const value = changeValue(event.data.change);
  if (id === undefined || value === undefined) return undefined;
  return { id, type: UiCommandType.ControlSetValue, value };
}

function nodeCommand<TType extends NodeCommandType>(
  event: UiEvent,
  type: TType
): NodeCommand<TType> | undefined {
  const id = sourceId(event);
  return id === undefined ? undefined : { id, type };
}

function sourceId(event: UiEvent): string | undefined {
  return event.data.sourceNode?.id;
}

function changeValue(change: JsonValue | undefined): JsonValue | undefined {
  if (!isRecord(change)) return undefined;
  return change["value"];
}

function isRecord(value: JsonValue | undefined): value is Readonly<Record<string, JsonValue>> {
  if (value === null) return false;
  if (typeof value !== "object") return false;
  return !Array.isArray(value);
}
