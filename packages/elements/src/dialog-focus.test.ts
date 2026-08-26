// @vitest-environment happy-dom
import { expect, it } from "vitest";

import { adjacentDialogTabIndex, dialogTabStops } from "./dialog-focus.js";

it("collects only rendered focus stops across light and shadow DOM", () => {
  const dialog = document.createElement("div");
  const dismiss = document.createElement("button");
  const visible = document.createElement("button");
  dialog.append(
    visible,
    hiddenControl((container) => (container.style.display = "none")),
    hiddenControl((container) => (container.style.visibility = "hidden")),
    hiddenControl((container) => container.setAttribute("aria-hidden", "true")),
    hiddenControl((container) => (container.inert = true)),
    shadowControl()
  );
  document.body.append(dialog);

  expect(dialogTabStops(dialog, dismiss)).toEqual([dismiss, visible, shadowButton(dialog)]);
  dialog.remove();
});

it("wraps forward and backward from known and unknown positions", () => {
  expect(adjacentDialogTabIndex(0, 2, false)).toBe(1);
  expect(adjacentDialogTabIndex(1, 2, false)).toBe(0);
  expect(adjacentDialogTabIndex(0, 2, true)).toBe(1);
  expect(adjacentDialogTabIndex(-1, 2, false)).toBe(0);
  expect(adjacentDialogTabIndex(-1, 2, true)).toBe(1);
  expect(adjacentDialogTabIndex(-1, 0, false)).toBe(0);
});

function shadowControl(): HTMLElement {
  const host = document.createElement("span");
  host.attachShadow({ mode: "open" }).append(document.createElement("button"));
  return host;
}

function hiddenControl(hide: (container: HTMLElement) => void): HTMLElement {
  const container = document.createElement("section");
  hide(container);
  container.append(document.createElement("button"));
  return container;
}

function shadowButton(dialog: HTMLElement): HTMLButtonElement {
  const host = requireHtmlElement(dialog.lastElementChild);
  const root = requireShadowRoot(host.shadowRoot);
  return requireButton(root.querySelector("button"));
}

function requireHtmlElement(element: Element | null): HTMLElement {
  if (!(element instanceof HTMLElement)) throw new Error("Shadow host is missing.");
  return element;
}

function requireShadowRoot(root: ShadowRoot | null): ShadowRoot {
  if (root === null) throw new Error("Shadow root is missing.");
  return root;
}

function requireButton(element: Element | null): HTMLButtonElement {
  if (!(element instanceof HTMLButtonElement)) throw new Error("Shadow button is missing.");
  return element;
}
