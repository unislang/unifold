// @vitest-environment happy-dom
import { SearchFieldAutocomplete } from "@unislang/unifold-catalog";
import type { UiEvent, UiNodeSnapshot } from "@unislang/unifold-events";
import { expect, it, vi } from "vitest";

import { controlNode } from "./elements.test-data.js";
import { ElementEventName, ElementEventType } from "./enums.js";
import { UnifoldSearchField } from "./search-field.js";

it("renders a native searchbox and emits canonical string changes", async () => {
  defineSearchField();
  const field = document.createElement("unifold-search-field-test") as UnifoldSearchField;
  field.id = "query";
  field.eventNode = controlNode("query", "old query");
  field.autocomplete = SearchFieldAutocomplete.On;
  field.label = "Search records";
  field.name = "query";
  field.required = true;
  document.body.append(field);
  await field.updateComplete;

  const events: UiEvent[] = [];
  field.addEventListener(ElementEventName.UiEvent, (event) => events.push(detail(event)));
  const input = nativeInput(field);
  input.value = "Ada Lovelace";
  input.dispatchEvent(new InputEvent("input", { bubbles: true }));
  input.dispatchEvent(new FocusEvent("blur"));

  expectNativeSearchSemantics(input);
  expect(events.map(({ type }) => type)).toEqual([
    ElementEventType.ControlInput,
    ElementEventType.ControlBlurred
  ]);
  expect(requiredSnapshot(events[0]).control).toMatchObject({ value: "Ada Lovelace" });
});

function expectNativeSearchSemantics(input: HTMLInputElement): void {
  expect(input).toMatchObject({
    autocomplete: "on",
    maxLength: 2_048,
    name: "query",
    required: true,
    type: "search"
  });
  expect(input.getAttribute("role")).toBeNull();
}

it("rolls back programmatic input beyond the shared query bound", async () => {
  defineSearchField();
  const field = document.createElement("unifold-search-field-test") as UnifoldSearchField;
  field.eventNode = controlNode("query", "safe", undefined, "SearchField");
  field.label = "Search";
  field.maxLength = 4;
  field.value = "safe";
  document.body.append(field);
  await field.updateComplete;
  const input = nativeInput(field);
  input.value = "unsafe";
  input.dispatchEvent(new InputEvent("input", { bubbles: true }));
  expect(field.value).toBe("safe");
  expect(input.value).toBe("safe");
});

it("forwards an uncomposed Enter key to the owning native form", async () => {
  defineSearchField();
  const form = document.createElement("form");
  const field = document.createElement("unifold-search-field-test") as UnifoldSearchField;
  field.label = "Search";
  Object.defineProperty(field, "form", { get: () => form });
  form.append(field);
  document.body.append(form);
  await field.updateComplete;
  const requestSubmit = vi.spyOn(form, "requestSubmit").mockImplementation(() => undefined);

  nativeInput(field).dispatchEvent(keydown("Enter"));
  nativeInput(field).dispatchEvent(keydown("Enter", true));

  expect(requestSubmit).toHaveBeenCalledOnce();
});

function defineSearchField(): void {
  if (customElements.get("unifold-search-field-test") === undefined)
    customElements.define("unifold-search-field-test", UnifoldSearchField);
}

function nativeInput(element: UnifoldSearchField): HTMLInputElement {
  const input = element.shadowRoot?.querySelector("input");
  if (!(input instanceof HTMLInputElement)) throw new Error("Search input was not rendered.");
  return input;
}

function detail(event: Event): UiEvent {
  return (event as CustomEvent<UiEvent>).detail;
}

function requiredSnapshot(event: UiEvent | undefined): UiNodeSnapshot {
  const snapshot = event?.data.snapshot;
  if (snapshot === undefined) throw new Error("Event snapshot is missing.");
  return snapshot;
}

function keydown(key: string, isComposing = false): KeyboardEvent {
  return new KeyboardEvent("keydown", { bubbles: true, cancelable: true, isComposing, key });
}
