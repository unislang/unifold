// @vitest-environment happy-dom
import { CoreElementTag } from "@unislang/unifold-catalog";
import type { UiEvent } from "@unislang/unifold-events";
import { expect, it, vi } from "vitest";

import { componentNode } from "./elements.test-data.js";
import { defineUnifoldDialog } from "./dialog-entry.js";
import type { UnifoldDialog } from "./dialog.js";
import { ElementEventName } from "./enums.js";

it("opens modally, inerts background, and restores focus after localized dismissal", async () => {
  const outside = document.createElement("button");
  const dialog = configuredDialog();
  const events: UiEvent[] = [];
  dialog.addEventListener(ElementEventName.UiEvent, (event) => events.push(detail(event)));
  document.body.append(outside, dialog);
  await dialog.updateComplete;
  const native = surface(dialog);
  stubNativeDialog(native);

  trigger(dialog).click();
  await dialog.updateComplete;
  expect(dialog.open).toBe(true);
  expect(native.open).toBe(true);
  expect(native.getAttribute("aria-label")).toBe("Confirm account change");
  expect(outside.inert).toBe(true);
  expect(requireShadowRoot(dialog).activeElement).toBe(dismiss(dialog));
  expect(events[0]?.data.change).toEqual({ open: true, reason: "trigger" });

  assertTabLoop(dialog);

  dismiss(dialog).click();
  await dialog.updateComplete;
  expect(dialog.open).toBe(false);
  expect(outside.inert).toBe(false);
  expect(requireShadowRoot(dialog).activeElement).toBe(trigger(dialog));
  expect(events[1]?.data.change).toEqual({ open: false, reason: "dismiss" });
  dialog.remove();
  outside.remove();
});

it("contains fallback focus and closes through Escape when native modal APIs fail", async () => {
  const outside = document.createElement("button");
  const dialog = configuredDialog();
  document.body.append(dialog, outside);
  await dialog.updateComplete;
  const native = surface(dialog);
  Object.defineProperty(native, "showModal", {
    configurable: true,
    value: () => {
      throw new Error("unsupported");
    }
  });

  trigger(dialog).click();
  await dialog.updateComplete;
  outside.focus();
  expect(requireShadowRoot(dialog).activeElement).toBe(dismiss(dialog));
  native.dispatchEvent(key("Tab"));
  expect(requireShadowRoot(dialog).activeElement).toBe(dismiss(dialog));
  native.dispatchEvent(key("Escape"));
  await dialog.updateComplete;
  expect(dialog.open).toBe(false);
  expect(requireShadowRoot(dialog).activeElement).toBe(trigger(dialog));
  dialog.remove();
  outside.remove();
});

it("does not intercept keyboard input while closed", async () => {
  const dialog = configuredDialog();
  document.body.append(dialog);
  await dialog.updateComplete;
  trigger(dialog).focus();
  const tab = key("Tab");
  const escape = key("Escape");
  trigger(dialog).dispatchEvent(tab);
  trigger(dialog).dispatchEvent(escape);
  expect(tab.defaultPrevented).toBe(false);
  expect(escape.defaultPrevented).toBe(false);
  expect(requireShadowRoot(dialog).activeElement).toBe(trigger(dialog));
  dialog.remove();
});

it("closes only the nested fallback dialog on Escape", async () => {
  const parent = configuredDialog();
  const nested = configuredDialog();
  parent.append(nested);
  document.body.append(parent);
  await Promise.all([parent.updateComplete, nested.updateComplete]);
  failNativeDialog(surface(parent));
  failNativeDialog(surface(nested));
  trigger(parent).click();
  await parent.updateComplete;
  trigger(nested).click();
  await nested.updateComplete;
  surface(nested).dispatchEvent(key("Escape"));
  await nested.updateComplete;
  expect(nested.open).toBe(false);
  expect(parent.open).toBe(true);
  parent.remove();
});

it("handles native cancellation, native close, disablement, and disconnected cleanup", async () => {
  const outside = document.createElement("button");
  outside.inert = true;
  const dialog = configuredDialog();
  document.body.append(outside, dialog);
  await dialog.updateComplete;
  stubNativeDialog(surface(dialog));

  trigger(dialog).click();
  await dialog.updateComplete;
  surface(dialog).dispatchEvent(new Event("cancel", { cancelable: true }));
  await dialog.updateComplete;
  expect(dialog.open).toBe(false);
  expect(outside.inert).toBe(true);

  trigger(dialog).click();
  await dialog.updateComplete;
  surface(dialog).dispatchEvent(new Event("close"));
  await dialog.updateComplete;
  expect(dialog.open).toBe(false);

  trigger(dialog).click();
  await dialog.updateComplete;
  dialog.disabled = true;
  await dialog.updateComplete;
  expect(dialog.open).toBe(false);
  expect(trigger(dialog).disabled).toBe(true);
  trigger(dialog).click();
  dialog.remove();
  expect(outside.inert).toBe(true);
  outside.remove();
});

it("tolerates absent or throwing native close APIs and ignores irrelevant input", async () => {
  const dialog = configuredDialog();
  document.body.append(dialog);
  await dialog.updateComplete;
  const native = surface(dialog);
  Object.defineProperty(native, "showModal", { configurable: true, value: undefined });
  trigger(dialog).click();
  await dialog.updateComplete;
  Object.defineProperty(native, "close", {
    configurable: true,
    value: () => {
      throw new Error("close failed");
    }
  });
  dismiss(dialog).click();
  await dialog.updateComplete;
  expect(dialog.open).toBe(false);
  native.dispatchEvent(key("Enter"));
  native.dispatchEvent(new Event("close"));
  dialog.remove();
});

function configuredDialog(): UnifoldDialog {
  defineUnifoldDialog(customElements);
  const dialog = document.createElement(CoreElementTag.Dialog) as UnifoldDialog;
  dialog.eventNode = componentNode("confirmation", "Dialog");
  dialog.runtimeContext = { documentId: "dialog-test" };
  dialog.id = "confirmation";
  dialog.dialogLabel = "Confirm account change";
  dialog.dismissLabel = "Cancel account change";
  dialog.label = "Review account change";
  dialog.append(document.createElement("button"));
  return dialog;
}

function stubNativeDialog(dialog: HTMLDialogElement): void {
  Object.defineProperties(dialog, {
    close: { configurable: true, value: vi.fn(() => dialog.removeAttribute("open")) },
    showModal: { configurable: true, value: vi.fn(() => dialog.setAttribute("open", "")) }
  });
}

function failNativeDialog(dialog: HTMLDialogElement): void {
  Object.defineProperty(dialog, "showModal", {
    configurable: true,
    value: () => {
      throw new Error("unsupported");
    }
  });
}

function trigger(dialog: UnifoldDialog): HTMLButtonElement {
  return requireElement(dialog, "[part=trigger]");
}

function dismiss(dialog: UnifoldDialog): HTMLButtonElement {
  return requireElement(dialog, "[part=dismiss]");
}

function surface(dialog: UnifoldDialog): HTMLDialogElement {
  return requireElement(dialog, "[part=surface]");
}

function requireElement<T extends Element>(dialog: UnifoldDialog, selector: string): T {
  const element = requireShadowRoot(dialog).querySelector<T>(selector);
  if (element === null) throw new Error(`Missing ${selector}.`);
  return element;
}

function requireShadowRoot(dialog: UnifoldDialog): ShadowRoot {
  const root = dialog.shadowRoot;
  if (root === null) throw new Error("Dialog shadow root is missing.");
  return root;
}

function requireLightButton(dialog: UnifoldDialog): HTMLButtonElement {
  const button = dialog.querySelector("button");
  if (button === null) throw new Error("Dialog light-DOM button is missing.");
  return button;
}

function assertTabLoop(dialog: UnifoldDialog): void {
  const contentButton = requireLightButton(dialog);
  dismiss(dialog).dispatchEvent(key("Tab"));
  expect(document.activeElement).toBe(contentButton);
  contentButton.dispatchEvent(key("Tab", true));
  expect(requireShadowRoot(dialog).activeElement).toBe(dismiss(dialog));
}

function key(value: string, shiftKey = false): KeyboardEvent {
  return new KeyboardEvent("keydown", { bubbles: true, composed: true, key: value, shiftKey });
}

function detail(event: Event): UiEvent {
  return (event as CustomEvent<UiEvent>).detail;
}
