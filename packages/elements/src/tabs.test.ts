// @vitest-environment happy-dom
import { TabActivationMode, type TabItem } from "@unislang/unifold-catalog";
import { expect, it, vi } from "vitest";

import { controlNode } from "./elements.test-data.js";
import { ElementEventName, ElementEventType, registerCoreElements, UnifoldTabs } from "./index.js";

it("switches stable panels with automatic roving focus and one controlled intent", async () => {
  const tabs = configuredTabs();
  const events = vi.fn();
  tabs.addEventListener(ElementEventName.UiEvent, events);
  document.body.append(tabs);
  await tabs.updateComplete;
  const panels = panelChildren(tabs);

  tabButton(tabs, 0).dispatchEvent(key("ArrowRight"));
  await tabs.updateComplete;

  expect(tabs.value).toBe("activity");
  expect(tabs.shadowRoot?.activeElement).toBe(tabButton(tabs, 2));
  expect(tabButton(tabs, 2).getAttribute("aria-selected")).toBe("true");
  expect(panel(tabs, 2).hidden).toBe(false);
  expect(panel(tabs, 0).hidden).toBe(true);
  expect(panelChildren(tabs)).toEqual(panels);
  expect(inputIntents(events)).toEqual(["activity"]);
  tabButton(tabs, 2).dispatchEvent(
    new FocusEvent("focusout", { bubbles: true, composed: true, relatedTarget: document.body })
  );
  expect(eventTypes(events)).toContain(ElementEventType.ControlBlurred);
});

it("requires an explicit commit in manual mode and wraps past disabled tabs", async () => {
  const tabs = configuredTabs();
  tabs.activationMode = TabActivationMode.Manual;
  document.body.append(tabs);
  await tabs.updateComplete;

  tabButton(tabs, 0).dispatchEvent(key("ArrowLeft"));
  await tabs.updateComplete;
  expect(tabs.value).toBe("summary");
  expect(tabs.shadowRoot?.activeElement).toBe(tabButton(tabs, 2));

  tabButton(tabs, 2).dispatchEvent(key("Enter"));
  await tabs.updateComplete;
  expect(tabs.value).toBe("activity");
});

it("renders exact bounded ARIA relationships and preserves hostile panel text", async () => {
  const tabs = configuredTabs(100);
  document.body.append(tabs);
  await tabs.updateComplete;
  const root = tabs.shadowRoot as ShadowRoot;

  expect(root.querySelectorAll('[role="tab"]')).toHaveLength(100);
  expect(root.querySelectorAll('[role="tabpanel"]')).toHaveLength(100);
  expect(tabButton(tabs, 0).getAttribute("aria-controls")).toBe("account-tabs__tabpanel_0");
  expect(panel(tabs, 0).getAttribute("aria-labelledby")).toBe("account-tabs__tab_0");
  expect(tabButton(tabs, 1).disabled).toBe(true);
  expect(tabs.textContent).toContain('<img src=x onerror="alert(1)">');
  expect(tabs.querySelector("img")).toBeNull();
});

function configuredTabs(count = 3): UnifoldTabs {
  registerCoreElements();
  const element = document.createElement("unifold-tabs") as UnifoldTabs;
  const items = tabItems(count);
  Object.assign(element, {
    id: "account-tabs",
    label: "Account sections",
    tabs: items,
    value: "summary"
  });
  element.eventNode = controlNode("account-tabs", element.value, undefined, "Tabs");
  items.forEach((item) => element.append(panelContent(item)));
  return element;
}

function tabItems(count: number): readonly TabItem[] {
  return Array.from({ length: count }, (_, index) => ({
    disabled: index === 1,
    id: index === 0 ? "summary" : index === 2 ? "activity" : `tab-${index}`,
    label: `Tab ${index}`
  }));
}

function panelContent(item: TabItem): HTMLElement {
  const element = document.createElement("p");
  element.textContent = `<img src=x onerror="alert(1)"> ${item.id}`;
  return element;
}

function tabButton(tabs: UnifoldTabs, index: number): HTMLButtonElement {
  const button = tabs.shadowRoot?.querySelector(`[data-tab-index="${index}"]`);
  if (!(button instanceof HTMLButtonElement)) throw new Error(`Tab ${index} is missing.`);
  return button;
}

function panel(tabs: UnifoldTabs, index: number): HTMLElement {
  const candidate = tabs.shadowRoot?.querySelector(`#account-tabs__tabpanel_${index}`);
  if (!(candidate instanceof HTMLElement)) throw new Error(`Panel ${index} is missing.`);
  return candidate;
}

function panelChildren(tabs: UnifoldTabs): readonly Element[] {
  return [...tabs.children];
}

function key(value: string): KeyboardEvent {
  return new KeyboardEvent("keydown", { bubbles: true, key: value });
}

function inputIntents(events: ReturnType<typeof vi.fn>): readonly unknown[] {
  return events.mock.calls
    .map(([event]) => event.detail)
    .filter((detail) => detail.type === ElementEventType.ControlInput)
    .map((detail) => detail.data.change.value);
}

function eventTypes(events: ReturnType<typeof vi.fn>): readonly unknown[] {
  return events.mock.calls.map(([event]) => event.detail.type);
}
