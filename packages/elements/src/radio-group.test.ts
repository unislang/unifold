// @vitest-environment happy-dom
import type { UiEvent } from "@unislang/unifold-events";
import { expect, it } from "vitest";

import {
  ElementEventName,
  NativeFormValueOrigin,
  registerCoreElements,
  UnifoldRadioGroup
} from "./index.js";
import { controlNode } from "./elements.test-data.js";

it("uses a native labeled radio group and emits its selected value", verifyRadioGroup);

async function verifyRadioGroup(): Promise<void> {
  const element = await mountRadioGroup();
  const events: UiEvent[] = [];
  element.addEventListener(ElementEventName.UiEvent, (event) => events.push(detail(event)));
  const inputs = requiredInputs(element);
  const email = requiredInput(inputs, 0);
  const phone = requiredInput(inputs, 1);
  const sms = requiredInput(inputs, 2);
  expect(requiredLegend(element).textContent).toBe("Contact preference");
  expect(email.checked).toBe(true);
  expect(sms.disabled).toBe(true);
  phone.dispatchEvent(new Event("change", { bubbles: true }));
  const event = requiredEvent(events);
  expect(event.data.change).toEqual({ origin: NativeFormValueOrigin.Input, value: "phone" });
  expect(event.data.snapshot?.control?.value).toBe("phone");
}

async function mountRadioGroup(): Promise<UnifoldRadioGroup> {
  registerCoreElements();
  const element = document.createElement("unifold-radio-group") as UnifoldRadioGroup;
  element.eventNode = controlNode("contact", "email", undefined, "RadioGroup");
  element.label = "Contact preference";
  element.name = "contact";
  element.options = [
    { label: "Email", value: "email" },
    { label: "Phone", value: "phone" },
    { disabled: true, label: "SMS", value: "sms" }
  ];
  element.value = "email";
  document.body.append(element);
  await element.updateComplete;
  return element;
}

function requiredInputs(element: UnifoldRadioGroup): readonly HTMLInputElement[] {
  const root = element.shadowRoot;
  if (root === null) throw new Error("Radio group shadow root is missing.");
  const inputs = [...root.querySelectorAll("input")];
  if (inputs.length !== 3) throw new Error("Radio group inputs are missing.");
  return inputs as HTMLInputElement[];
}

function requiredInput(inputs: readonly HTMLInputElement[], index: number): HTMLInputElement {
  const input = inputs[index];
  if (input === undefined) throw new Error(`Radio input ${index} is missing.`);
  return input;
}

function requiredEvent(events: readonly UiEvent[]): UiEvent {
  const event = events[0];
  if (event === undefined) throw new Error("Radio group event is missing.");
  return event;
}

function requiredLegend(element: UnifoldRadioGroup): HTMLLegendElement {
  const legend = element.shadowRoot?.querySelector("legend");
  if (!(legend instanceof HTMLLegendElement)) throw new Error("Radio group legend is missing.");
  return legend;
}

function detail(event: Event): UiEvent {
  return (event as CustomEvent<UiEvent>).detail;
}
