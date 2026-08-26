// @vitest-environment happy-dom
import type { ChoiceOption } from "@unislang/unifold-catalog";
import { expect, it, vi } from "vitest";

import { ElementEventName } from "./index.js";
import { defineUnifoldVirtualList, UnifoldVirtualList } from "./virtual-list-entry.js";
import { controlNode } from "./elements.test-data.js";

it("bounds a 10k list while preserving focus, selection, and canonical input", async () => {
  const list = configuredList();
  const events = vi.fn();
  list.addEventListener(ElementEventName.UiEvent, events);
  document.body.append(list);
  await list.updateComplete;

  const viewport = requireViewport(list);
  viewport.focus();
  assertInitialWindow(list);

  viewport.scrollTop = 9_000 * list.itemHeight;
  viewport.dispatchEvent(new Event("scroll"));
  await list.updateComplete;
  assertScrolledWindow(list, viewport);

  viewport.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
  await list.updateComplete;
  expect(list.value).toBe("item-08998");
  expect(events).toHaveBeenCalledTimes(1);
});

it("supports listbox keyboard navigation and skips disabled options", async () => {
  const list = configuredList();
  list.options = [
    { label: "First", value: "first" },
    { disabled: true, label: "Blocked", value: "blocked" },
    { label: "Third", value: "third" }
  ];
  list.value = "first";
  document.body.append(list);
  await list.updateComplete;

  const viewport = requireViewport(list);
  viewport.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown" }));
  await list.updateComplete;
  expect(viewport.getAttribute("aria-activedescendant")).toBe("records__option_2");

  viewport.dispatchEvent(new KeyboardEvent("keydown", { key: " " }));
  await list.updateComplete;
  expect(list.value).toBe("third");

  viewport.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp" }));
  await list.updateComplete;
  expect(viewport.getAttribute("aria-activedescendant")).toBe("records__option_0");
});

it("caps oversized windows and ignores disabled control selection", async () => {
  const list = configuredList();
  Object.assign(list, { disabled: true, itemHeight: 1, overscan: 100, viewportHeight: 1_000 });
  document.body.append(list);
  await list.updateComplete;

  const viewport = requireViewport(list);
  expect(renderedOptions(list)).toHaveLength(200);
  expect(viewport.getAttribute("aria-disabled")).toBe("true");
  viewport.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
  expect(list.value).toBe("item-00010");
});

function configuredList(): UnifoldVirtualList {
  defineUnifoldVirtualList();
  const list = document.createElement("unifold-virtual-list") as UnifoldVirtualList;
  Object.assign(list, {
    id: "records",
    itemHeight: 32,
    label: "Records",
    options: options(10_000),
    overscan: 2,
    value: "item-00010",
    viewportHeight: 320
  });
  list.eventNode = controlNode("records", list.value, undefined, "VirtualList");
  return list;
}

function assertInitialWindow(list: UnifoldVirtualList): void {
  expect(renderedOptions(list).length).toBe(14);
  expect(selectedOption(list)?.textContent.trim()).toBe("Item 10");
}

function assertScrolledWindow(list: UnifoldVirtualList, viewport: HTMLElement): void {
  expect(renderedOptions(list).length).toBeLessThanOrEqual(200);
  expect(renderedOptions(list).some((item) => item.textContent.trim() === "Item 9000")).toBe(true);
  expect(list.value).toBe("item-00010");
  expect(list.shadowRoot?.activeElement).toBe(viewport);
}

function options(count: number): readonly ChoiceOption[] {
  return Array.from({ length: count }, (_, index) => ({
    label: `Item ${index}`,
    value: `item-${String(index).padStart(5, "0")}`
  }));
}

function requireViewport(list: UnifoldVirtualList): HTMLElement {
  const viewport = list.shadowRoot?.querySelector<HTMLElement>("[part=viewport]");
  if (!(viewport instanceof HTMLElement)) throw new Error("Viewport is missing.");
  return viewport;
}

function renderedOptions(list: UnifoldVirtualList): readonly HTMLElement[] {
  return [...(list.shadowRoot?.querySelectorAll<HTMLElement>("[role=option]") ?? [])];
}

function selectedOption(list: UnifoldVirtualList): HTMLElement | undefined {
  return list.shadowRoot?.querySelector<HTMLElement>('[aria-selected="true"]') ?? undefined;
}
