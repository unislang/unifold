import { ElementEventType } from "@unislang/unifold-elements";
import {
  UiCommandType,
  UiEventPhase,
  UiNodeKind,
  createUiEvent,
  type UiEvent
} from "@unislang/unifold-events";
import { expect, it } from "vitest";

import { commandForEvent, eventExecutionContext } from "./event-command.js";

it("maps control and form intents to typed commands", () => {
  expect(commandForEvent(intent(ElementEventType.ControlInput, { value: "Ada" }))).toEqual({
    id: "field",
    type: UiCommandType.ControlSetValue,
    value: "Ada"
  });
  expect(commandForEvent(intent(ElementEventType.ControlBlurred, {}))).toEqual({
    id: "field",
    type: UiCommandType.ControlMarkTouched
  });
  expect(commandForEvent(intent(ElementEventType.FormSubmitRequested, {}))).toEqual({
    id: "field",
    type: UiCommandType.FormSubmit
  });
  expect(commandForEvent(intent(ElementEventType.FormResetRequested, {}))).toEqual({
    id: "field",
    type: UiCommandType.FormReset
  });
});

it("preserves causal metadata and ignores incomplete intents", () => {
  const event = intent(ElementEventType.ComponentActivated, {});
  expect(eventExecutionContext(event)).toEqual({
    causationId: "intent",
    correlationId: "correlation",
    transactionId: "transaction"
  });
  expect(commandForEvent(event)).toBeUndefined();
  expect(commandForEvent(intent(ElementEventType.ControlInput, {}))).toBeUndefined();
});

function intent(type: ElementEventType, change: Record<string, string>): UiEvent {
  return createUiEvent({
    id: "intent",
    source: "urn:test",
    type,
    time: "2026-08-24T00:00:00.000Z",
    correlationid: "correlation",
    transactionid: "transaction",
    sequence: 1,
    staterevision: 0,
    data: {
      change,
      phase: UiEventPhase.Intent,
      runtime: { documentId: "test" },
      sourceNode: {
        id: "field",
        instanceId: "field",
        kind: UiNodeKind.Control,
        scopePath: ["field"],
        type: "TextField",
        version: "1.0.0"
      }
    }
  });
}
