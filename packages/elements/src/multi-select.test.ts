// @vitest-environment happy-dom
import type { UiEvent } from "@unislang/unifold-events";
import { expect, it } from "vitest";

import {
  ElementEventName,
  NativeFormValueOrigin,
  registerCoreElements,
  UnifoldMultiSelect
} from "./index.js";
import { controlNode } from "./elements.test-data.js";

it("emits all selected native option values as one array", verifyMultiSelect);
it("restores exact option arrays and resets from a defensive initial snapshot", verifyLifecycle);

async function verifyMultiSelect(): Promise<void> {
  registerCoreElements();
  const element = document.createElement("unifold-multi-select") as UnifoldMultiSelect;
  configure(element);
  document.body.append(element);
  await element.updateComplete;
  const events: UiEvent[] = [];
  element.addEventListener(ElementEventName.UiEvent, (event) => events.push(detail(event)));
  const select = requiredSelect(element);
  requiredOption(select, 1).selected = true;
  select.dispatchEvent(new Event("change", { bubbles: true }));
  await element.updateComplete;
  const event = requiredEvent(events);
  expect(event.data.change).toEqual({
    origin: NativeFormValueOrigin.Input,
    value: ["ts", "a11y"]
  });
  expect(event.data.snapshot?.control?.value).toEqual(["ts", "a11y"]);
  expect(select.multiple).toBe(true);
  expect(requiredOption(select, 2).disabled).toBe(true);
  element.value = ["ts"];
  await element.updateComplete;
  const resetSelect = requiredSelect(element);
  expect(requiredOption(resetSelect, 0).selected).toBe(true);
  expect(requiredOption(resetSelect, 1).selected).toBe(false);
  expect(UnifoldMultiSelect.formAssociated).toBe(true);
  element.name = "skills";
  await element.updateComplete;
  expect(element.getAttribute("name")).toBe("skills");
}

function configure(element: UnifoldMultiSelect): void {
  element.eventNode = controlNode("skills", ["ts"], undefined, "MultiSelect");
  element.label = "Skills";
  element.options = [
    { label: "TypeScript", value: "ts" },
    { label: "Accessibility", value: "a11y" },
    { disabled: true, label: "Unavailable", value: "disabled" }
  ];
  element.value = ["ts"];
}

async function verifyLifecycle(): Promise<void> {
  registerCoreElements();
  const element = document.createElement("unifold-multi-select") as UnifoldMultiSelect;
  element.eventNode = controlNode("skills-lifecycle", ["ts"], undefined, "MultiSelect");
  element.label = "Lifecycle skills";
  element.name = "skills";
  element.options = [
    { label: "TypeScript", value: "ts" },
    { label: "Accessibility", value: "a11y" }
  ];
  element.value = ["ts"];
  document.body.append(element);
  await element.updateComplete;
  const events: UiEvent[] = [];
  element.addEventListener(ElementEventName.UiEvent, (event) => events.push(detail(event)));
  element.formStateRestoreCallback('["ts","a11y"]', NativeFormValueOrigin.Restore);
  await element.updateComplete;
  expect(requiredSelect(element).selectedOptions).toHaveLength(2);
  element.formStateRestoreCallback('["missing"]', NativeFormValueOrigin.Restore);
  element.formResetCallback();
  await element.updateComplete;
  expect(element.value).toEqual(["ts"]);
  expect(events.map(({ data }) => data.change)).toEqual([
    { origin: NativeFormValueOrigin.Restore, value: ["ts", "a11y"] },
    { origin: NativeFormValueOrigin.Reset, value: ["ts"] }
  ]);
}

function requiredSelect(element: UnifoldMultiSelect): HTMLSelectElement {
  const select = element.shadowRoot?.querySelector("select");
  if (!(select instanceof HTMLSelectElement)) throw new Error("Multi-select is missing.");
  return select;
}

function detail(event: Event): UiEvent {
  return (event as CustomEvent<UiEvent>).detail;
}

function requiredEvent(events: readonly UiEvent[]): UiEvent {
  const event = events[0];
  if (event === undefined) throw new Error("Multi-select event is missing.");
  return event;
}

function requiredOption(select: HTMLSelectElement, index: number): HTMLOptionElement {
  const option = select.options.item(index);
  if (option === null) throw new Error(`Option ${index} is missing.`);
  return option;
}
