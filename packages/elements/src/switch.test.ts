// @vitest-environment happy-dom
import type { UiEvent } from "@unislang/unifold-events";
import { expect, it } from "vitest";

import { controlNode } from "./elements.test-data.js";
import { ElementEventName, ElementEventType, NativeFormValueOrigin } from "./enums.js";
import { UnifoldSwitch } from "./switch.js";

it("uses a labeled ARIA switch and emits boolean input and blur intents", async () => {
  const element = await switchElement(false);
  element.required = true;
  await element.updateComplete;
  const events = captureEvents(element);
  const input = requiredInput(element);
  input.checked = true;
  input.dispatchEvent(new Event("change", { bubbles: true }));
  input.dispatchEvent(new FocusEvent("blur"));
  expect(input.getAttribute("role")).toBe("switch");
  expect(input.type).toBe("checkbox");
  expect(input.name).toBe("notifications");
  expect(input.required).toBe(true);
  expect(events.map(({ type }) => type)).toEqual([
    ElementEventType.ControlInput,
    ElementEventType.ControlBlurred
  ]);
  expect(requiredEvent(events).data.change).toEqual({
    origin: NativeFormValueOrigin.Input,
    value: true
  });
  expect(element.value).toBe(true);
  expect(UnifoldSwitch.formAssociated).toBe(true);
});

it("restores disabled tampering and delegates reset and restore lifecycle", async () => {
  const element = await switchElement(false);
  const events = captureEvents(element);
  element.formDisabledCallback(true);
  await element.updateComplete;
  const input = requiredInput(element);
  input.checked = true;
  input.dispatchEvent(new Event("change", { bubbles: true }));
  expect(input.checked).toBe(false);
  element.formDisabledCallback(false);
  element.formStateRestoreCallback("true", NativeFormValueOrigin.Restore);
  await element.updateComplete;
  expect(requiredInput(element).checked).toBe(true);
  element.formResetCallback();
  await element.updateComplete;
  expect(requiredInput(element).checked).toBe(false);
  expect(events.map(({ data }) => data.change)).toEqual([
    { origin: NativeFormValueOrigin.Restore, value: true },
    { origin: NativeFormValueOrigin.Reset, value: false }
  ]);
});

async function switchElement(value: boolean): Promise<UnifoldSwitch> {
  defineSwitch();
  const element = document.createElement("unifold-switch-test") as UnifoldSwitch;
  element.eventNode = controlNode("notifications", value, undefined, "Switch");
  element.id = "notifications";
  element.label = "Enable notifications";
  element.name = "notifications";
  element.value = value;
  document.body.append(element);
  await element.updateComplete;
  return element;
}

function defineSwitch(): void {
  if (customElements.get("unifold-switch-test") === undefined)
    customElements.define("unifold-switch-test", UnifoldSwitch);
}

function captureEvents(element: UnifoldSwitch): UiEvent[] {
  const events: UiEvent[] = [];
  element.addEventListener(ElementEventName.UiEvent, (event) => {
    events.push((event as CustomEvent<UiEvent>).detail);
  });
  return events;
}

function requiredInput(element: UnifoldSwitch): HTMLInputElement {
  const input = element.shadowRoot?.querySelector("input");
  if (!(input instanceof HTMLInputElement)) throw new Error("Switch input is missing.");
  return input;
}

function requiredEvent(events: readonly UiEvent[]): UiEvent {
  const event = events[0];
  if (event === undefined) throw new Error("Switch event is missing.");
  return event;
}
