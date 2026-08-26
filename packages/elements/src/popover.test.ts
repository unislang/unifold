// @vitest-environment happy-dom
import { CoreElementTag, TooltipPlacement } from "@unislang/unifold-catalog";
import type { UiEvent } from "@unislang/unifold-events";
import { expect, it, vi } from "vitest";

import { componentNode } from "./elements.test-data.js";
import { ElementEventName } from "./enums.js";
import { defineUnifoldPopover } from "./popover-entry.js";
import type { UnifoldPopover } from "./popover.js";

it("opens a labeled dialog, emits activation, and restores trigger focus on Escape", async () => {
  const popover = configuredPopover();
  const events: UiEvent[] = [];
  popover.addEventListener(ElementEventName.UiEvent, (event) => events.push(detail(event)));
  document.body.append(popover);
  await popover.updateComplete;

  trigger(popover).click();
  await popover.updateComplete;
  expect(trigger(popover).getAttribute("aria-expanded")).toBe("true");
  expect(surface(popover).getAttribute("aria-label")).toBe("Current account details");
  expect(requireShadowRoot(popover).activeElement).toBe(surface(popover));
  expect(requireFirstEvent(events).data.change).toEqual({ open: true });

  surface(popover).dispatchEvent(key("Escape"));
  await popover.updateComplete;
  expect(trigger(popover).getAttribute("aria-expanded")).toBe("false");
  expect(requireShadowRoot(popover).activeElement).toBe(trigger(popover));
  popover.remove();
});

it("closes on outside pointer and focus departure without stealing external focus", async () => {
  const popover = configuredPopover();
  const outside = document.createElement("button");
  document.body.append(popover, outside);
  await popover.updateComplete;
  trigger(popover).click();
  await popover.updateComplete;

  outside.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, composed: true }));
  await popover.updateComplete;
  expect(popover.open).toBe(false);
  trigger(popover).click();
  await popover.updateComplete;
  surface(popover).dispatchEvent(
    new FocusEvent("focusout", { bubbles: true, composed: true, relatedTarget: outside })
  );
  await popover.updateComplete;
  expect(popover.open).toBe(false);
  popover.remove();
  outside.remove();
});

it("closes when disabled and tolerates missing, throwing, and native dismissal APIs", async () => {
  const popover = configuredPopover();
  document.body.append(popover);
  await popover.updateComplete;
  const panel = surface(popover);
  Object.defineProperty(panel, "showPopover", {
    configurable: true,
    value: () => {
      throw new Error("unsupported");
    }
  });
  trigger(popover).click();
  await popover.updateComplete;
  panel.dispatchEvent(Object.assign(new Event("toggle"), { newState: "closed" }));
  await popover.updateComplete;
  expect(popover.open).toBe(false);

  Object.defineProperty(panel, "showPopover", { configurable: true, value: undefined });
  Object.defineProperty(panel, "hidePopover", { configurable: true, value: undefined });
  trigger(popover).click();
  await popover.updateComplete;
  popover.disabled = true;
  await popover.updateComplete;
  expect(popover.open).toBe(false);
  popover.remove();
});

it("uses available native show and hide APIs in right-to-left layouts", async () => {
  const popover = configuredPopover();
  popover.style.direction = "rtl";
  document.body.append(popover);
  await popover.updateComplete;
  const panel = surface(popover);
  let nativeOpen = false;
  const showPopover = vi.fn(() => (nativeOpen = true));
  const hidePopover = vi.fn(() => (nativeOpen = false));
  Object.defineProperties(panel, {
    hidePopover: { configurable: true, value: hidePopover },
    matches: { configurable: true, value: vi.fn(() => nativeOpen) },
    showPopover: { configurable: true, value: showPopover }
  });
  trigger(popover).click();
  await popover.updateComplete;
  expect(showPopover).toHaveBeenCalledOnce();
  trigger(popover).click();
  await popover.updateComplete;
  expect(hidePopover).toHaveBeenCalledOnce();
  popover.remove();
});

it("ignores dismissal input that does not apply to the open surface", async () => {
  const popover = configuredPopover();
  document.body.append(popover);
  await popover.updateComplete;
  surface(popover).dispatchEvent(key("Escape"));
  document.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, composed: true }));
  trigger(popover).click();
  await popover.updateComplete;
  surface(popover).dispatchEvent(key("Enter"));
  trigger(popover).dispatchEvent(
    new FocusEvent("focusout", { bubbles: true, composed: true, relatedTarget: surface(popover) })
  );
  trigger(popover).dispatchEvent(
    new PointerEvent("pointerdown", { bubbles: true, composed: true })
  );
  surface(popover).dispatchEvent(Object.assign(new Event("toggle"), { newState: "open" }));
  expect(popover.open).toBe(true);
  popover.remove();
});

it("ignores disabled activation and dismissal while already closed", async () => {
  const popover = configuredPopover();
  document.body.append(popover);
  await popover.updateComplete;

  popover.label = "Updated account details";
  await popover.updateComplete;
  popover.disabled = true;
  await popover.updateComplete;
  trigger(popover).dispatchEvent(new MouseEvent("click", { bubbles: true, composed: true }));
  surface(popover).dispatchEvent(
    new FocusEvent("focusout", { bubbles: true, composed: true, relatedTarget: null })
  );

  expect(popover.open).toBe(false);
  popover.remove();
});

function configuredPopover(): UnifoldPopover {
  defineUnifoldPopover(customElements);
  const popover = document.createElement(CoreElementTag.Popover) as UnifoldPopover;
  popover.eventNode = componentNode("details", "Popover");
  popover.runtimeContext = { documentId: "popover-test" };
  popover.id = "details";
  popover.label = "Account details";
  popover.panelLabel = "Current account details";
  popover.placement = TooltipPlacement.Bottom;
  popover.append(document.createElement("button"));
  return popover;
}

function trigger(popover: UnifoldPopover): HTMLButtonElement {
  return requireElement(popover, "[part=trigger]");
}

function surface(popover: UnifoldPopover): HTMLElement {
  return requireElement(popover, "[part=surface]");
}

function requireElement<T extends Element>(popover: UnifoldPopover, selector: string): T {
  const element = requireShadowRoot(popover).querySelector<T>(selector);
  if (element === null) throw new Error(`Missing ${selector}.`);
  return element;
}

function requireShadowRoot(popover: UnifoldPopover): ShadowRoot {
  const root = popover.shadowRoot;
  if (root === null) throw new Error("Popover shadow root is missing.");
  return root;
}

function requireFirstEvent(events: readonly UiEvent[]): UiEvent {
  const event = events[0];
  if (event === undefined) throw new Error("Popover activation event is missing.");
  return event;
}

function key(value: string): KeyboardEvent {
  return new KeyboardEvent("keydown", { bubbles: true, composed: true, key: value });
}

function detail(event: Event): UiEvent {
  return (event as CustomEvent<UiEvent>).detail;
}
