// @vitest-environment happy-dom
import { type MenuItem } from "@unislang/unifold-catalog";
import type { UiEvent } from "@unislang/unifold-events";
import { expect, it, vi } from "vitest";

import { componentNode } from "./elements.test-data.js";
import {
  ElementEventName,
  ElementEventType,
  registerCoreElements,
  UnifoldMenuButton
} from "./index.js";

it("opens with exact ARIA relationships and wraps past disabled items", async () => {
  const menu = configuredMenu();
  document.body.append(menu);
  await menu.updateComplete;

  trigger(menu).dispatchEvent(key("ArrowUp"));
  await menu.updateComplete;
  expect(trigger(menu).getAttribute("aria-expanded")).toBe("true");
  expect(menuRoot(menu).getAttribute("aria-label")).toBe("Account actions");
  expect(activeElement(menu)).toBe(item(menu, 2));

  item(menu, 2).dispatchEvent(key("ArrowDown"));
  await menu.updateComplete;
  expect(activeElement(menu)).toBe(item(menu, 0));
  item(menu, 0).dispatchEvent(key("ArrowDown"));
  await menu.updateComplete;
  expect(activeElement(menu)).toBe(item(menu, 2));
});

it("emits one declared action, closes, and restores trigger focus", async () => {
  const menu = configuredMenu();
  const events: UiEvent[] = [];
  menu.addEventListener(ElementEventName.UiEvent, (event) => events.push(detail(event)));
  document.body.append(menu);
  await menu.updateComplete;

  trigger(menu).click();
  await menu.updateComplete;
  item(menu, 2).click();
  await menu.updateComplete;

  expect(menu.open).toBe(false);
  expect(menu.shadowRoot?.activeElement).toBe(trigger(menu));
  expect(events).toHaveLength(1);
  expect(events[0]).toMatchObject({
    type: ElementEventType.ComponentActivated,
    data: {
      change: { itemId: "archive" },
      snapshot: {
        properties: { disabled: false, items: menuItems(), label: "Account actions" }
      },
      sourceNode: { id: "account-menu", type: "MenuButton" }
    }
  });
});

it("closes on Escape, outside pointer, and disabled updates without activating", async () => {
  const menu = configuredMenu();
  const listener = vi.fn();
  menu.addEventListener(ElementEventName.UiEvent, listener);
  document.body.append(menu);
  await menu.updateComplete;

  trigger(menu).click();
  await menu.updateComplete;
  item(menu, 0).dispatchEvent(key("Escape"));
  await menu.updateComplete;
  expect(menu.shadowRoot?.activeElement).toBe(trigger(menu));

  trigger(menu).click();
  await menu.updateComplete;
  document.body.dispatchEvent(new Event("pointerdown", { bubbles: true, composed: true }));
  await menu.updateComplete;
  expect(menu.open).toBe(false);

  menu.disabled = true;
  await menu.updateComplete;
  trigger(menu).click();
  item(menu, 1).click();
  expect(trigger(menu).disabled).toBe(true);
  expect(listener).not.toHaveBeenCalled();
});

it("renders one hundred escaped item labels without creating authored markup", async () => {
  const menu = configuredMenu(
    Array.from({ length: 100 }, (_, index) => ({
      label: `<img src=x onerror=alert(1)> Item ${index}`,
      value: `item-${index}`
    }))
  );
  document.body.append(menu);
  await menu.updateComplete;

  expect(menu.shadowRoot?.querySelectorAll('[role="menuitem"]')).toHaveLength(100);
  expect(menu.shadowRoot?.querySelector("img")).toBeNull();
  expect(item(menu, 99).textContent).toContain("<img src=x onerror=alert(1)>");
});

function configuredMenu(items: readonly MenuItem[] = menuItems()): UnifoldMenuButton {
  registerCoreElements();
  const element = document.createElement("unifold-menu-button") as UnifoldMenuButton;
  Object.assign(element, { id: "account-menu", items, label: "Account actions" });
  element.eventNode = componentNode("account-menu", "MenuButton");
  return element;
}

function menuItems(): readonly MenuItem[] {
  return [
    { label: "Edit", value: "edit" },
    { disabled: true, label: "Delete", value: "delete" },
    { label: "Archive", value: "archive" }
  ];
}

function trigger(menu: UnifoldMenuButton): HTMLButtonElement {
  return requiredButton(menu, "[part=trigger]");
}

function item(menu: UnifoldMenuButton, index: number): HTMLButtonElement {
  return requiredButton(menu, `[data-menu-index="${index}"]`);
}

function requiredButton(menu: UnifoldMenuButton, selector: string): HTMLButtonElement {
  const candidate = menu.shadowRoot?.querySelector(selector);
  if (!(candidate instanceof HTMLButtonElement)) throw new Error(`${selector} is missing.`);
  return candidate;
}

function menuRoot(menu: UnifoldMenuButton): HTMLElement {
  const candidate = menu.shadowRoot?.querySelector('[role="menu"]');
  if (!(candidate instanceof HTMLElement)) throw new Error("Menu is missing.");
  return candidate;
}

function activeElement(menu: UnifoldMenuButton): Element | null | undefined {
  return menu.shadowRoot?.activeElement;
}

function key(value: string): KeyboardEvent {
  return new KeyboardEvent("keydown", { bubbles: true, key: value });
}

function detail(event: Event): UiEvent {
  return (event as CustomEvent<UiEvent>).detail;
}
