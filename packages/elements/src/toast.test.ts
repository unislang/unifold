// @vitest-environment happy-dom
import {
  CoreElementTag,
  ToastDismissReason,
  ToastStatus,
  ToastVariant
} from "@unislang/unifold-catalog";
import type { UiEvent } from "@unislang/unifold-events";
import { expect, it, vi } from "vitest";

import { componentNode } from "./elements.test-data.js";
import { ElementEventName, ElementEventType } from "./enums.js";
import { defineUnifoldToast } from "./toast-registration.js";
import type { UnifoldToast } from "./toast.js";

it("announces polite content and emits one manual dismissal intent", async () => {
  const toast = await configuredToast();
  const events: UiEvent[] = [];
  toast.addEventListener(ElementEventName.UiEvent, (event) => events.push(detail(event)));
  dismissButton(toast).click();
  const event = requiredEvent(events);
  expect(announcement(toast).getAttribute("role")).toBe("status");
  expect(announcement(toast).getAttribute("aria-atomic")).toBe("true");
  expect(announcement(toast).textContent).not.toContain(toast.dismissLabel);
  expect(event.type).toBe(ElementEventType.ComponentActivated);
  expect(event.data.change).toEqual({
    dismissed: true,
    reason: ToastDismissReason.Manual
  });
  expect(event.data.snapshot?.properties).toMatchObject({
    label: "Profile saved",
    message: "Your changes are ready.",
    status: ToastStatus.Success,
    variant: ToastVariant.Solid,
    visible: true
  });
});

it("uses assertive semantics without stealing focus", async () => {
  const outside = document.createElement("button");
  document.body.append(outside);
  outside.focus();
  const toast = await configuredToast();
  toast.status = ToastStatus.Error;
  await toast.updateComplete;
  expect(announcement(toast).getAttribute("role")).toBe("alert");
  expect(document.activeElement).toBe(outside);
});

it("omits dismissal control and events when dismissal is disabled", async () => {
  const toast = await configuredToast();
  const listener = vi.fn();
  toast.addEventListener(ElementEventName.UiEvent, listener);
  toast.dismissible = false;
  toast.status = ToastStatus.Warning;
  await toast.updateComplete;
  expect(toast.shadowRoot?.querySelector("button")).toBeNull();
  expect(announcement(toast).getAttribute("role")).toBe("alert");
  expect(listener).not.toHaveBeenCalled();
  toast.visible = false;
  await toast.updateComplete;
  const root = requiredShadowRoot(toast);
  expect(toast.hidden).toBe(true);
  expect(root.querySelector("[role]")).toBeNull();
  expect(root.textContent).toBe("");
  expect(listener).not.toHaveBeenCalled();
});

async function configuredToast(): Promise<UnifoldToast> {
  defineUnifoldToast(customElements);
  const toast = document.createElement(CoreElementTag.Toast) as UnifoldToast;
  toast.eventNode = componentNode("saved", "Toast");
  toast.runtimeContext = { documentId: "toast-test" };
  toast.id = "saved";
  toast.dismissLabel = "Dismiss saved message";
  toast.label = "Profile saved";
  toast.message = "Your changes are ready.";
  toast.status = ToastStatus.Success;
  toast.variant = ToastVariant.Solid;
  document.body.append(toast);
  await toast.updateComplete;
  return toast;
}

function announcement(toast: UnifoldToast): HTMLElement {
  return requiredElement(toast, "[part=announcement]");
}

function dismissButton(toast: UnifoldToast): HTMLButtonElement {
  return requiredElement(toast, "[part=dismiss]");
}

function requiredElement<T extends Element>(toast: UnifoldToast, selector: string): T {
  const root = requiredShadowRoot(toast);
  const element = root.querySelector<T>(selector);
  if (element === null) throw new Error(`Missing ${selector}.`);
  return element;
}

function requiredShadowRoot(toast: UnifoldToast): ShadowRoot {
  const root = toast.shadowRoot;
  if (root === null) throw new Error("Toast shadow root is missing.");
  return root;
}

function requiredEvent(events: readonly UiEvent[]): UiEvent {
  const event = events[0];
  if (event === undefined) throw new Error("Toast event is missing.");
  return event;
}

function detail(event: Event): UiEvent {
  return (event as CustomEvent<UiEvent>).detail;
}
