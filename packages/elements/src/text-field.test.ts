// @vitest-environment happy-dom
import { TextFieldInputType } from "@unislang/unifold-catalog";
import type { UiEvent, UiNodeSnapshot } from "@unislang/unifold-events";
import { expect, it } from "vitest";

import {
  ElementEventName,
  ElementEventType,
  registerCoreElements,
  UnifoldTextField
} from "./index.js";
import { controlNode } from "./elements.test-data.js";

it("renders accessibility state and emits value changes", verifyTextField);

async function verifyTextField(): Promise<void> {
  const field = await mountTextField();
  configureField(field);
  await field.updateComplete;
  const events: UiEvent[] = [];
  field.addEventListener(ElementEventName.UiEvent, (event) => events.push(detail(event)));
  changeField(field);
  expect(nativeInput(field)).toMatchObject({
    name: "emailAddress",
    required: true,
    readOnly: true
  });
  expect(nativeInput(field).getAttribute("aria-invalid")).toBe("true");
  expect(events.map((event) => event.type)).toEqual([
    ElementEventType.ControlInput,
    ElementEventType.ControlBlurred
  ]);
  expect(requiredSnapshot(requiredEvent(events, 0)).control).toMatchObject({
    value: "new@example.com"
  });
}

function configureField(field: UnifoldTextField): void {
  field.id = "email";
  field.eventNode = controlNode("email", "old");
  field.inputType = TextFieldInputType.Email;
  field.label = "Email";
  field.name = "emailAddress";
  field.placeholder = "name@example.com";
  field.required = true;
  field.readonly = true;
  field.errorMessage = "Required";
}

function changeField(field: UnifoldTextField): void {
  const input = nativeInput(field);
  input.value = "new@example.com";
  input.dispatchEvent(new InputEvent("input", { bubbles: true }));
  input.dispatchEvent(new FocusEvent("blur"));
}

async function mountTextField(): Promise<UnifoldTextField> {
  registerCoreElements();
  const element = document.createElement("unifold-text-field") as UnifoldTextField;
  document.body.append(element);
  await element.updateComplete;
  return element;
}

function nativeInput(element: UnifoldTextField): HTMLInputElement {
  const input = element.shadowRoot?.querySelector("input");
  if (!(input instanceof HTMLInputElement)) throw new Error("Input was not rendered.");
  return input;
}

function detail(event: Event): UiEvent {
  return (event as CustomEvent<UiEvent>).detail;
}

function requiredEvent(events: readonly UiEvent[], index: number): UiEvent {
  const event = events[index];
  if (event === undefined) throw new Error(`Event ${index} is missing.`);
  return event;
}

function requiredSnapshot(event: UiEvent): UiNodeSnapshot {
  const snapshot = event.data.snapshot;
  if (snapshot === undefined) throw new Error("Event snapshot is missing.");
  return snapshot;
}
