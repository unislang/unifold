// @vitest-environment happy-dom
import type { WorkflowStep } from "@unislang/unifold-catalog";
import { expect, it, vi } from "vitest";

import { controlNode } from "./elements.test-data.js";
import {
  ElementEventName,
  ElementEventType,
  registerCoreElements,
  UnifoldWizard
} from "./index.js";

it("navigates stable authored panels linearly and emits controlled state", async () => {
  const wizard = configuredWizard();
  const panels = [...wizard.children];
  const events = vi.fn();
  wizard.addEventListener(ElementEventName.UiEvent, events);
  document.body.append(wizard);
  await wizard.updateComplete;

  const account = requireItem(panels, 0);
  const billing = requireItem(panels, 1);
  const review = requireItem(panels, 2);
  expect(account.hasAttribute("hidden")).toBe(false);
  expect(billing.hasAttribute("hidden")).toBe(true);
  expect(stepButton(wizard, 2).disabled).toBe(true);
  actionButton(wizard, "next").click();
  await wizard.updateComplete;

  expect(wizard.value).toBe("review");
  expect([...wizard.children]).toEqual(panels);
  expect(account.hasAttribute("hidden")).toBe(true);
  expect(review.hasAttribute("hidden")).toBe(false);
  expect(requireShadowRoot(wizard).activeElement).toBe(requirePanel(wizard));
  const input = events.mock.calls.map(([event]) => event.detail).find(isControlInput);
  const intent = requireValue(input, "Control input is missing.");
  expect(intent.data.change).toEqual({ value: "review" });
  expect(intent.data.snapshot.properties.steps).toHaveLength(3);
});

it("emits an explicit final completion intent and supports backward navigation", async () => {
  const wizard = configuredWizard();
  wizard.value = "review";
  const events = vi.fn();
  wizard.addEventListener(ElementEventName.UiEvent, events);
  document.body.append(wizard);
  await wizard.updateComplete;

  actionButton(wizard, "complete").click();
  const completion = events.mock.calls.map(([event]) => event.detail).find(isActivation);
  expect(completion?.data.change).toEqual({ action: "complete", value: "review" });

  actionButton(wizard, "back").click();
  await wizard.updateComplete;
  expect(wizard.value).toBe("account");
});

function configuredWizard(): UnifoldWizard {
  registerCoreElements();
  const wizard = document.createElement("unifold-wizard") as UnifoldWizard;
  const workflowSteps: readonly WorkflowStep[] = [
    { id: "account", label: "Account" },
    { disabled: true, id: "billing", label: "Billing" },
    { id: "review", label: "Review" }
  ];
  Object.assign(wizard, {
    id: "account-wizard",
    label: "Create account",
    steps: workflowSteps,
    value: "account"
  });
  workflowSteps.forEach((step) => wizard.append(panel(step.id)));
  wizard.eventNode = controlNode("account-wizard", wizard.value, undefined, "Wizard");
  return wizard;
}

function panel(id: string): HTMLElement {
  const element = document.createElement("section");
  element.textContent = `${id} panel`;
  return element;
}

function stepButton(wizard: UnifoldWizard, index: number): HTMLButtonElement {
  const candidate = wizard.shadowRoot?.querySelector<HTMLButtonElement>(
    `[data-step-index="${index}"]`
  );
  if (!(candidate instanceof HTMLButtonElement)) throw new Error(`Step ${index} is missing.`);
  return candidate;
}

function actionButton(wizard: UnifoldWizard, part: string): HTMLButtonElement {
  const candidate = wizard.shadowRoot?.querySelector<HTMLButtonElement>(`[part="${part}"]`);
  if (!(candidate instanceof HTMLButtonElement)) throw new Error(`${part} button is missing.`);
  return candidate;
}

function requirePanel(wizard: UnifoldWizard): HTMLElement {
  const panel = wizard.shadowRoot?.querySelector<HTMLElement>("[part=panel]");
  if (!(panel instanceof HTMLElement)) throw new Error("Wizard panel is missing.");
  return panel;
}

function isControlInput(event: { type: string }): boolean {
  return event.type === ElementEventType.ControlInput;
}

function isActivation(event: { type: string }): boolean {
  return event.type === ElementEventType.ComponentActivated;
}

function requireItem<T>(values: readonly T[], index: number): T {
  return requireValue(values[index], `Item ${index} is missing.`);
}

function requireShadowRoot(element: Element): ShadowRoot {
  return requireValue(element.shadowRoot, "Shadow root is missing.");
}

function requireValue<T>(value: T | null | undefined, message: string): T {
  if (value === undefined || value === null) throw new Error(message);
  return value;
}
