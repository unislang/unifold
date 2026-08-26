// @vitest-environment happy-dom
import { ButtonAction, ButtonVariant } from "@unislang/unifold-catalog";
import type { UiEvent } from "@unislang/unifold-events";
import { expect, it, vi } from "vitest";

import {
  ElementEventName,
  ElementEventType,
  registerCoreElements,
  UnifoldButton
} from "./index.js";
import { controlNode } from "./elements.test-data.js";

it("renders button properties and emits activation", verifyButton);
it("honors a disabled native button", verifyDisabledButton);

async function verifyButton(): Promise<void> {
  const button = await mountButton();
  button.eventNode = controlNode("save", "");
  button.action = ButtonAction.Submit;
  button.label = "Save";
  button.variant = ButtonVariant.Secondary;
  await button.updateComplete;
  const events: UiEvent[] = [];
  button.addEventListener(ElementEventName.UiEvent, (event) => events.push(detail(event)));
  nativeButton(button).click();
  expect(nativeButton(button).textContent).toContain("Save");
  expect(nativeButton(button).type).toBe(ButtonAction.Submit);
  expect(events).toHaveLength(1);
  expect(events[0]).toMatchObject({
    type: ElementEventType.ComponentActivated,
    data: {
      change: { action: ButtonAction.Submit },
      snapshot: { properties: { label: "Save", variant: ButtonVariant.Secondary } }
    }
  });
}

async function verifyDisabledButton(): Promise<void> {
  const button = await mountButton();
  button.eventNode = controlNode("disabled", "");
  button.disabled = true;
  await button.updateComplete;
  const listener = vi.fn();
  button.addEventListener(ElementEventName.UiEvent, listener);
  nativeButton(button).click();
  expect(nativeButton(button).disabled).toBe(true);
  expect(listener).not.toHaveBeenCalled();
}

async function mountButton(): Promise<UnifoldButton> {
  registerCoreElements();
  const element = document.createElement("unifold-button") as UnifoldButton;
  document.body.append(element);
  await element.updateComplete;
  return element;
}

function nativeButton(element: UnifoldButton): HTMLButtonElement {
  const button = element.shadowRoot?.querySelector("button");
  if (!(button instanceof HTMLButtonElement)) throw new Error("Button was not rendered.");
  return button;
}

function detail(event: Event): UiEvent {
  return (event as CustomEvent<UiEvent>).detail;
}
