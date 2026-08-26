// @vitest-environment happy-dom
import { UiUpdateTrigger } from "@unislang/unifold-contracts";
import type { UiEvent } from "@unislang/unifold-events";
import { expect, it } from "vitest";

import { ElementEventName, ElementEventType } from "./enums.js";
import { controlNode } from "./elements.test-data.js";
import { defineUnifoldNumberField, UnifoldNumberField } from "./number-field-entry.js";

it("renders native numeric constraints and emits number/null canonical intents", async () => {
  const field = await mountField();
  configureField(field);
  await field.updateComplete;
  const events: UiEvent[] = [];
  field.addEventListener(ElementEventName.UiEvent, (event) => events.push(detail(event)));
  const input = nativeInput(field);
  expect(input).toMatchObject({ max: "130", min: "0", name: "age", step: "0.5" });
  exerciseField(input);
  expectEventTypes(events);
  expect(events[0]?.data.change).toMatchObject({ value: 42.5 });
  expect(events[1]?.data.change).toMatchObject({ value: null });
  field.value = Number.NaN;
  expect(field.value).toBeNull();
  expect(UnifoldNumberField.formAssociated).toBe(true);
});

it("reports intrinsic numeric validity and tolerates detached access", async () => {
  const detached = new UnifoldNumberField();
  expect(detached.formControlValidity()).toBeUndefined();
  detached.value = 12;
  detached.value = 12;
  expect(detached.value).toBe(12);

  const field = await mountField();
  const input = nativeInput(field);
  input.setCustomValidity("Numeric value is invalid.");
  expect(field.formControlValidity()).toMatchObject({ message: "Numeric value is invalid." });
});

function configureField(field: UnifoldNumberField): void {
  field.eventNode = controlNode("age", null, undefined, "NumberField");
  Object.assign(field, {
    id: "age",
    label: "Age",
    max: 130,
    min: 0,
    name: "age",
    required: true,
    step: 0.5,
    updateOn: UiUpdateTrigger.Input
  });
}

function exerciseField(input: HTMLInputElement): void {
  input.value = "42.5";
  input.dispatchEvent(new InputEvent("input", { bubbles: true }));
  input.value = "";
  input.dispatchEvent(new InputEvent("input", { bubbles: true }));
  input.dispatchEvent(new FocusEvent("blur"));
}

function expectEventTypes(events: readonly UiEvent[]): void {
  expect(events.map(({ type }) => type)).toEqual([
    ElementEventType.ControlInput,
    ElementEventType.ControlInput,
    ElementEventType.ControlBlurred
  ]);
}

async function mountField(): Promise<UnifoldNumberField> {
  defineUnifoldNumberField();
  const field = document.createElement("unifold-number-field") as UnifoldNumberField;
  document.body.append(field);
  await field.updateComplete;
  return field;
}

function nativeInput(field: UnifoldNumberField): HTMLInputElement {
  const input = field.shadowRoot?.querySelector("input");
  if (!(input instanceof HTMLInputElement)) throw new Error("Number input was not rendered.");
  return input;
}

function detail(event: Event): UiEvent {
  return (event as CustomEvent<UiEvent>).detail;
}
