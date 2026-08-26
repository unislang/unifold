// @vitest-environment happy-dom
import type { WorkflowStep } from "@unislang/unifold-catalog";
import { expect, it, vi } from "vitest";

import { controlNode } from "./elements.test-data.js";
import {
  ElementEventName,
  ElementEventType,
  registerCoreElements,
  UnifoldStepper
} from "./index.js";

it("uses roving keyboard focus and emits one complete controlled step selection", async () => {
  const stepper = configuredStepper();
  const events = vi.fn();
  stepper.addEventListener(ElementEventName.UiEvent, events);
  document.body.append(stepper);
  await stepper.updateComplete;

  const first = button(stepper, 0);
  first.focus();
  first.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "ArrowRight" }));
  await stepper.updateComplete;
  expect(stepper.shadowRoot?.activeElement).toBe(button(stepper, 2));

  button(stepper, 2).dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Enter" }));
  await stepper.updateComplete;
  expect(stepper.value).toBe("step-2");
  expect(button(stepper, 2).getAttribute("aria-current")).toBe("step");
  const intents = events.mock.calls.map(([event]) => event.detail).filter(isControlInput);
  expect(intents).toHaveLength(1);
  const intent = requireFirst(intents);
  expect(intent.data.change).toEqual({ value: "step-2" });
  expect(intent.data.snapshot.control.value).toBe("step-2");
});

it("bounds exact step DOM, disables authored steps, and renders hostile text safely", async () => {
  const stepper = configuredStepper(100);
  document.body.append(stepper);
  await stepper.updateComplete;

  const root = stepper.shadowRoot as ShadowRoot;
  expect(root.querySelectorAll("[part=step]")).toHaveLength(100);
  expect(button(stepper, 1).disabled).toBe(true);
  expect(root.textContent).toContain('<img src=x onerror="alert(1)">');
  expect(root.querySelector("img")).toBeNull();
});

function configuredStepper(count = 3): UnifoldStepper {
  registerCoreElements();
  const stepper = document.createElement("unifold-stepper") as UnifoldStepper;
  const workflowSteps = steps(count);
  Object.assign(stepper, {
    id: "checkout-progress",
    label: "Checkout progress",
    steps: workflowSteps,
    value: requireFirst(workflowSteps).id
  });
  stepper.eventNode = controlNode("checkout-progress", stepper.value, undefined, "Stepper");
  return stepper;
}

function steps(count: number): readonly WorkflowStep[] {
  return Array.from({ length: count }, (_, index) => ({
    description: `<img src=x onerror="alert(1)"> ${index}`,
    disabled: index === 1,
    id: `step-${index}`,
    label: `Step ${index}`
  }));
}

function button(stepper: UnifoldStepper, index: number): HTMLButtonElement {
  const candidate = stepper.shadowRoot?.querySelector<HTMLButtonElement>(
    `[data-step-index="${index}"]`
  );
  if (!(candidate instanceof HTMLButtonElement)) throw new Error(`Step ${index} is missing.`);
  return candidate;
}

function isControlInput(event: { type: string }): boolean {
  return event.type === ElementEventType.ControlInput;
}

function requireFirst<T>(values: readonly T[]): T {
  const value = values[0];
  if (value === undefined) throw new Error("Expected a first value.");
  return value;
}
