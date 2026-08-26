// @vitest-environment happy-dom
import type { UiEvent } from "@unislang/unifold-events";
import { expect, it } from "vitest";

import {
  ElementEventName,
  ElementEventType,
  registerCoreElements,
  UnifoldCheckbox
} from "./index.js";
import { controlNode } from "./elements.test-data.js";

it("uses a native checkbox and emits boolean control values", verifyCheckbox);

async function verifyCheckbox(): Promise<void> {
  registerCoreElements();
  const checkbox = document.createElement("unifold-checkbox") as UnifoldCheckbox;
  checkbox.eventNode = controlNode("terms", false, undefined, "Checkbox");
  checkbox.label = "Accept terms";
  checkbox.name = "terms";
  checkbox.required = true;
  document.body.append(checkbox);
  await checkbox.updateComplete;
  const events: UiEvent[] = [];
  checkbox.addEventListener(ElementEventName.UiEvent, (event) => events.push(detail(event)));
  const input = requiredInput(checkbox);
  input.checked = true;
  input.dispatchEvent(new Event("change", { bubbles: true }));
  input.dispatchEvent(new FocusEvent("blur"));
  expect(events.map(({ type }) => type)).toEqual([
    ElementEventType.ControlInput,
    ElementEventType.ControlBlurred
  ]);
  const event = requiredEvent(events);
  expect(event.data.change).toEqual({ value: true });
  expect(event.data.snapshot?.control?.value).toBe(true);
  expect(input.required).toBe(true);
}

function requiredInput(element: UnifoldCheckbox): HTMLInputElement {
  const input = element.shadowRoot?.querySelector("input");
  if (!(input instanceof HTMLInputElement)) throw new Error("Checkbox input is missing.");
  return input;
}

function detail(event: Event): UiEvent {
  return (event as CustomEvent<UiEvent>).detail;
}

function requiredEvent(events: readonly UiEvent[]): UiEvent {
  const event = events[0];
  if (event === undefined) throw new Error("Checkbox event is missing.");
  return event;
}
