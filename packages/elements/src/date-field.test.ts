// @vitest-environment happy-dom
import { DateFieldAutocomplete } from "@unislang/unifold-catalog";
import type { UiEvent } from "@unislang/unifold-events";
import { expect, it } from "vitest";

import { controlNode } from "./elements.test-data.js";
import { ElementEventName, ElementEventType, NativeFormValueOrigin } from "./enums.js";
import { UnifoldDateField } from "./date-field.js";

it("renders exact native date constraints and emits timezone-free string intents", async () => {
  const field = await mountedDateField("2024-02-29");
  const events = captureEvents(field);
  const input = requiredInput(field);
  expectNativeContract(input);
  field.readonly = false;
  await field.updateComplete;
  input.value = "2025-03-08";
  input.dispatchEvent(new InputEvent("input", { bubbles: true }));
  input.dispatchEvent(new FocusEvent("blur"));
  expect(field.value).toBe("2025-03-08");
  expect(events.map(({ type }) => type)).toEqual([
    ElementEventType.ControlInput,
    ElementEventType.ControlBlurred
  ]);
  expect(requiredEvent(events).data.change).toEqual({
    origin: NativeFormValueOrigin.Input,
    value: "2025-03-08"
  });
  expect(UnifoldDateField.formAssociated).toBe(true);
});

function expectNativeContract(input: HTMLInputElement): void {
  expect(input).toMatchObject({
    autocomplete: DateFieldAutocomplete.Bday,
    max: "2030-12-31",
    min: "2000-01-01",
    name: "birthDate",
    readOnly: true,
    required: true,
    step: "1",
    type: "date",
    value: "2024-02-29"
  });
}

it("canonicalizes unsafe assignments and guards reset and restored date state", async () => {
  const field = await mountedDateField("2024-02-29");
  const events = captureEvents(field);
  field.value = "2024-02-30";
  field.min = "not-a-date";
  field.max = "2030-13-01";
  field.step = 0;
  expect(field).toMatchObject({ max: "", min: "", step: 1, value: "" });
  field.formStateRestoreCallback("unsafe", NativeFormValueOrigin.Restore);
  expect(events).toEqual([]);
  field.formStateRestoreCallback("2026-11-05", NativeFormValueOrigin.Restore);
  field.formResetCallback();
  expect(events.map(({ data }) => data.change)).toEqual([
    { origin: NativeFormValueOrigin.Restore, value: "2026-11-05" },
    { origin: NativeFormValueOrigin.Reset, value: "2024-02-29" }
  ]);
});

it("projects deterministic date range and native validity", async () => {
  const field = await mountedDateField("2024-02-29");
  field.min = "2025-01-01";
  expect(field.formControlValidity()).toEqual({
    flags: { rangeUnderflow: true },
    message: "Date is before the minimum."
  });
  field.min = "";
  field.step = 7;
  await field.updateComplete;
  expect(requiredInput(field).step).toBe("1");
  expect(field.formControlValidity()).toEqual({
    flags: { customError: true },
    message: "A minimum date is required when the day interval exceeds one."
  });
  field.step = 1;
  const input = requiredInput(field);
  input.setCustomValidity("Choose an available date.");
  expect(field.formControlValidity()).toMatchObject({ message: "Choose an available date." });
  expect(new UnifoldDateField().formControlValidity()).toBeUndefined();
});

it("rolls disabled and readonly synthetic input back to canonical state", async () => {
  const field = await mountedDateField("2024-02-29");
  const input = requiredInput(field);
  const events = captureEvents(field);
  field.disabled = true;
  input.value = "2025-03-08";
  input.dispatchEvent(new InputEvent("input", { bubbles: true }));
  expect(input.value).toBe("2024-02-29");
  field.disabled = false;
  field.readonly = true;
  input.value = "2025-03-08";
  input.dispatchEvent(new InputEvent("input", { bubbles: true }));
  expect(input.value).toBe("2024-02-29");
  expect(events).toEqual([]);
});

it("accepts an exact date type attribute when the browser property falls back", async () => {
  const field = await mountedDateField("2024-02-29");
  field.readonly = false;
  const input = requiredInput(field);
  input.value = "2025-03-08";
  Object.defineProperty(input, "type", { configurable: true, value: "text" });
  input.dispatchEvent(new InputEvent("input", { bubbles: true }));
  expect(input.getAttribute("type")).toBe("date");
  expect(field.value).toBe("2025-03-08");
});

async function mountedDateField(value: string): Promise<UnifoldDateField> {
  defineTestElement();
  const field = document.createElement("unifold-date-field-test") as UnifoldDateField;
  field.eventNode = controlNode("birth-date", value, undefined, "DateField");
  Object.assign(field, {
    autocomplete: DateFieldAutocomplete.Bday,
    id: "birth-date",
    label: "Birth date",
    max: "2030-12-31",
    min: "2000-01-01",
    name: "birthDate",
    readonly: true,
    required: true,
    step: 1,
    value
  });
  document.body.append(field);
  await field.updateComplete;
  return field;
}

function defineTestElement(): void {
  if (customElements.get("unifold-date-field-test") === undefined)
    customElements.define("unifold-date-field-test", UnifoldDateField);
}

function captureEvents(field: UnifoldDateField): UiEvent[] {
  const events: UiEvent[] = [];
  field.addEventListener(ElementEventName.UiEvent, (event) => {
    events.push((event as CustomEvent<UiEvent>).detail);
  });
  return events;
}

function requiredInput(field: UnifoldDateField): HTMLInputElement {
  const input = field.shadowRoot?.querySelector("input");
  if (!(input instanceof HTMLInputElement)) throw new Error("Date input was not rendered.");
  return input;
}

function requiredEvent(events: readonly UiEvent[]): UiEvent {
  const event = events[0];
  if (event === undefined) throw new Error("DateField event is missing.");
  return event;
}
