// @vitest-environment happy-dom
import type { UiEvent } from "@unislang/unifold-events";
import { expect, it } from "vitest";

import {
  ElementEventName,
  NativeFormValueOrigin,
  registerCoreElements,
  UnifoldSelect
} from "./index.js";
import { controlNode } from "./elements.test-data.js";

it("uses a labeled native select and emits the selected value", verifySelect);

async function verifySelect(): Promise<void> {
  registerCoreElements();
  const element = document.createElement("unifold-select") as UnifoldSelect;
  element.eventNode = controlNode("country", "us", undefined, "Select");
  element.label = "Country";
  element.name = "country";
  element.options = [
    { label: "United States", value: "us" },
    { label: "Canada", value: "ca" }
  ];
  element.value = "us";
  document.body.append(element);
  await element.updateComplete;
  const events: UiEvent[] = [];
  element.addEventListener(ElementEventName.UiEvent, (event) => events.push(detail(event)));
  const select = requiredSelect(element);
  select.value = "ca";
  select.dispatchEvent(new Event("change", { bubbles: true }));
  const event = requiredEvent(events);
  expect(event.data.change).toEqual({ origin: NativeFormValueOrigin.Input, value: "ca" });
  expect(controlValue(event)).toBe("ca");
  expect(requiredLabelText(element)).toBe("Country");
}

function requiredSelect(element: UnifoldSelect): HTMLSelectElement {
  const select = element.shadowRoot?.querySelector("select");
  if (!(select instanceof HTMLSelectElement)) throw new Error("Select is missing.");
  return select;
}

function detail(event: Event): UiEvent {
  return (event as CustomEvent<UiEvent>).detail;
}

function requiredEvent(events: readonly UiEvent[]): UiEvent {
  const event = events[0];
  if (event === undefined) throw new Error("Select event is missing.");
  return event;
}

function requiredLabelText(element: UnifoldSelect): string {
  const root = element.shadowRoot;
  if (root === null) throw new Error("Select shadow root is missing.");
  const label = root.querySelector("label > span");
  if (label === null) throw new Error("Select label is missing.");
  return normalizedText(label.textContent);
}

function normalizedText(value: string | null): string {
  return value === null ? "" : value.trim();
}

function controlValue(event: UiEvent) {
  const control = event.data.snapshot?.control;
  if (control === undefined) throw new Error("Select snapshot control is missing.");
  return control.value;
}
