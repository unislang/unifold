// @vitest-environment happy-dom
import type { UiEvent } from "@unislang/unifold-events";
import { expect, it } from "vitest";

import { ElementEventName, ElementEventType } from "./index.js";
import { defineUnifoldCombobox, UnifoldCombobox } from "./combobox-entry.js";
import { controlNode } from "./elements.test-data.js";

it("filters and commits a registered option with active-descendant keyboard semantics", async () => {
  const combobox = configuredCombobox();
  const events = captureEvents(combobox);
  document.body.append(combobox);
  await combobox.updateComplete;

  const input = requireInput(combobox);
  expect(input.value).toBe("Ada Lovelace");
  expect(input.getAttribute("role")).toBe("combobox");
  expect(input.getAttribute("aria-autocomplete")).toBe("list");
  expect(input.getAttribute("aria-expanded")).toBe("false");

  keydown(input, "ArrowDown");
  await combobox.updateComplete;
  expect(input.getAttribute("aria-expanded")).toBe("true");
  expect(input.getAttribute("aria-activedescendant")).toBe("assignee-option-0");

  keydown(input, "ArrowDown");
  await combobox.updateComplete;
  expect(input.getAttribute("aria-activedescendant")).toBe("assignee-option-2");
  keydown(input, "Enter");
  await combobox.updateComplete;

  expect(combobox.value).toBe("grace");
  expect(input.value).toBe("Grace Hopper");
  expect(input.getAttribute("aria-expanded")).toBe("false");
  expect(events.map(({ type }) => type)).toEqual([ElementEventType.ControlInput]);
  const event = requireEvent(events);
  expect(event.data.change).toEqual({ value: "grace" });
  expect(event.data.snapshot?.control?.value).toBe("grace");
});

it("keeps filtering local, restores on Escape, and canonically clears an empty query", async () => {
  const combobox = configuredCombobox();
  const events = captureEvents(combobox);
  document.body.append(combobox);
  await combobox.updateComplete;
  const input = requireInput(combobox);

  input.value = "hopper";
  input.dispatchEvent(new InputEvent("input", { bubbles: true }));
  await combobox.updateComplete;
  expect(optionTexts(combobox)).toEqual(["Grace Hopper"]);
  expect(events).toHaveLength(0);

  keydown(input, "Escape");
  await combobox.updateComplete;
  expect(input.value).toBe("Ada Lovelace");
  expect(input.getAttribute("aria-expanded")).toBe("false");

  input.value = "";
  input.dispatchEvent(new InputEvent("input", { bubbles: true }));
  await combobox.updateComplete;
  expect(combobox.value).toBe("");
  expect(requireEvent(events).data.change).toEqual({ value: "" });
});

it("ignores disabled pointer options, escapes authored labels, and emits blur", async () => {
  const combobox = configuredCombobox();
  combobox.options = [
    ...combobox.options,
    { label: "<img src=x onerror=alert(1)>", value: "escaped" }
  ];
  const events = captureEvents(combobox);
  document.body.append(combobox);
  await combobox.updateComplete;
  const input = requireInput(combobox);

  keydown(input, "ArrowDown");
  await combobox.updateComplete;
  clickOption(requireOption(combobox, "Blocked"));
  expect(combobox.value).toBe("ada");
  clickOption(requireOption(combobox, "Grace Hopper"));
  await combobox.updateComplete;
  expect(combobox.value).toBe("grace");
  expect(combobox.shadowRoot?.querySelector("img")).toBeNull();

  input.dispatchEvent(new FocusEvent("blur"));
  expect(events.map(({ type }) => type)).toEqual([
    ElementEventType.ControlInput,
    ElementEventType.ControlBlurred
  ]);
});

it("synchronizes a runtime-owned replacement while the popup is closed", async () => {
  const combobox = configuredCombobox();
  document.body.append(combobox);
  await combobox.updateComplete;

  combobox.value = "grace";
  await combobox.updateComplete;
  expect(requireInput(combobox).value).toBe("Grace Hopper");
});

it("bounds broad 10k-option results while retaining the full accessible set size", async () => {
  const combobox = configuredCombobox();
  combobox.options = Array.from({ length: 10_000 }, (_, index) => ({
    label: `Item ${index}`,
    value: `item-${index}`
  }));
  combobox.value = "item-10";
  document.body.append(combobox);
  await combobox.updateComplete;

  const input = requireInput(combobox);
  keydown(input, "ArrowDown");
  await combobox.updateComplete;
  const options = allOptions(combobox);
  expect(options).toHaveLength(200);
  expect(requireFirstOption(options).getAttribute("aria-setsize")).toBe("10000");
});

function configuredCombobox(): UnifoldCombobox {
  defineUnifoldCombobox();
  const combobox = document.createElement("unifold-combobox") as UnifoldCombobox;
  Object.assign(combobox, {
    id: "assignee",
    label: "Assignee",
    name: "assignee",
    options: [
      { label: "Ada Lovelace", value: "ada" },
      { disabled: true, label: "Blocked", value: "blocked" },
      { label: "Grace Hopper", value: "grace" }
    ],
    placeholder: "Choose a person",
    value: "ada"
  });
  combobox.eventNode = controlNode("assignee", "ada", undefined, "Combobox");
  return combobox;
}

function captureEvents(combobox: UnifoldCombobox): UiEvent[] {
  const events: UiEvent[] = [];
  combobox.addEventListener(ElementEventName.UiEvent, (event) => {
    events.push((event as CustomEvent<UiEvent>).detail);
  });
  return events;
}

function requireInput(combobox: UnifoldCombobox): HTMLInputElement {
  const input = combobox.shadowRoot?.querySelector("input");
  if (!(input instanceof HTMLInputElement)) throw new Error("Combobox input is missing.");
  return input;
}

function requireOption(combobox: UnifoldCombobox, name: string): HTMLElement {
  const option = allOptions(combobox).find((candidate) => optionText(candidate) === name);
  if (option === undefined) throw new Error(`Combobox option is missing: ${name}.`);
  return option;
}

function optionTexts(combobox: UnifoldCombobox): readonly string[] {
  return allOptions(combobox).map(optionText);
}

function allOptions(combobox: UnifoldCombobox): readonly HTMLElement[] {
  return [...requireShadowRoot(combobox).querySelectorAll<HTMLElement>("[role=option]")];
}

function requireShadowRoot(combobox: UnifoldCombobox): ShadowRoot {
  if (combobox.shadowRoot === null) throw new Error("Combobox shadow root is missing.");
  return combobox.shadowRoot;
}

function optionText(option: HTMLElement): string {
  return option.textContent?.trim() ?? "";
}

function requireFirstOption(options: readonly HTMLElement[]): HTMLElement {
  const option = options[0];
  if (option === undefined) throw new Error("Combobox has no rendered options.");
  return option;
}

function requireEvent(events: readonly UiEvent[]): UiEvent {
  const event = events[0];
  if (event === undefined) throw new Error("Combobox event is missing.");
  return event;
}

function keydown(input: HTMLInputElement, key: string): void {
  input.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key }));
}

function clickOption(option: HTMLElement): void {
  option.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true }));
  option.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
}
