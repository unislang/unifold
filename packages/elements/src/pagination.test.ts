// @vitest-environment happy-dom
import { CoreElementTag, PaginationItemKind, type PaginationItem } from "@unislang/unifold-catalog";
import type { UiEvent } from "@unislang/unifold-events";
import { expect, it, vi } from "vitest";

import { componentNode } from "./elements.test-data.js";
import { ElementEventName, ElementEventType } from "./enums.js";
import { defineUnifoldPagination } from "./pagination-registration.js";
import type { UnifoldPagination } from "./pagination.js";

it("renders the explicit native sequence with one current page", async () => {
  const pagination = await mountedPagination();
  const navigation = root(pagination).querySelector("nav");
  const controls = root(pagination).querySelectorAll("a, button");
  const current = root(pagination).querySelectorAll('[aria-current="page"]');

  expect(navigation?.getAttribute("aria-label") ?? "").toBe("Search result pages");
  expect(root(pagination).querySelectorAll("li")).toHaveLength(6);
  expect(controls).toHaveLength(5);
  expect(current).toHaveLength(1);
  expect(current.item(0).textContent).toContain("2");
  expect(control(pagination, 0).getAttribute("aria-label")).toBe("Go to previous page");
  expect(overflow(pagination).textContent).toContain("More pages");
  control(pagination, 5).focus();
  expect(root(pagination).activeElement).toBe(control(pagination, 5));
});

it("emits stable item, kind, link, and complete snapshot data without changing current state", async () => {
  const pagination = await mountedPagination();
  const events: UiEvent[] = [];
  pagination.addEventListener(ElementEventName.UiEvent, (event) => events.push(detail(event)));
  const next = control(pagination, 5);
  next.addEventListener("click", (event) => event.preventDefault());
  next.click();

  expect(events).toHaveLength(1);
  expect(events[0]).toMatchObject({
    data: {
      change: { href: "/search?page=3", itemId: "next", kind: PaginationItemKind.Next },
      snapshot: { properties: { items: paginationItems(), label: "Search result pages" } }
    },
    type: ElementEventType.ComponentActivated
  });
  expect(requiredElement(pagination, '[aria-current="page"]').textContent).toContain("2");
});

it("emits button activation without inventing a link", async () => {
  const pagination = await mountedPagination([
    page("one", "1", true),
    { accessibleLabel: "Go to page 2", id: "two", kind: PaginationItemKind.Page, label: "2" }
  ]);
  const listener = vi.fn();
  pagination.addEventListener(ElementEventName.UiEvent, listener);
  control(pagination, 1).click();

  expect(listener).toHaveBeenCalledOnce();
  expect(detail(firstCallEvent(listener.mock.calls)).data.change).toEqual({
    itemId: "two",
    kind: PaginationItemKind.Page
  });
});

it("keeps disabled, overflow, and unsafe destinations noninteractive", async () => {
  const pagination = await mountedPagination(noninteractiveItems());
  const listener = vi.fn();
  pagination.addEventListener(ElementEventName.UiEvent, listener);
  const disabled = disabledControl(pagination);
  assertSafeNoninteractiveMarkup(pagination, disabled);
  disabled.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  overflow(pagination).click();
  expect(listener).not.toHaveBeenCalled();

  control(pagination, 3).click();
  expect(detail(firstCallEvent(listener.mock.calls)).data.change).toEqual({
    itemId: "unsafe",
    kind: PaginationItemKind.Page
  });
});

function noninteractiveItems(): readonly PaginationItem[] {
  return [
    page("one", "1", true),
    paginationItem("disabled", "2", "Unavailable page", {
      disabled: true,
      href: "/search?page=2"
    }),
    paginationItem("more", "<more>", "More pages", { kind: PaginationItemKind.Overflow }),
    paginationItem("unsafe", "<img src=x onerror=alert(1)>", "Unsafe page", {
      href: "javascript:alert(1)"
    })
  ];
}

function paginationItem(
  id: string,
  label: string,
  accessibleLabel: string,
  overrides: Partial<PaginationItem>
): PaginationItem {
  return { accessibleLabel, id, kind: PaginationItemKind.Page, label, ...overrides };
}

async function mountedPagination(items = paginationItems()): Promise<UnifoldPagination> {
  defineUnifoldPagination(customElements);
  const element = document.createElement(CoreElementTag.Pagination) as UnifoldPagination;
  element.eventNode = componentNode("result-pages", "Pagination");
  element.runtimeContext = { documentId: "pagination-test" };
  element.id = "result-pages";
  element.items = items;
  element.label = "Search result pages";
  document.body.append(element);
  await element.updateComplete;
  return element;
}

function paginationItems(): readonly PaginationItem[] {
  return [
    navigationItem("previous", "Previous", PaginationItemKind.Previous, 1),
    page("one", "1"),
    page("two", "2", true),
    { accessibleLabel: "More pages", id: "more", kind: PaginationItemKind.Overflow, label: "…" },
    page("ten", "10"),
    navigationItem("next", "Next", PaginationItemKind.Next, 3)
  ];
}

function page(id: string, label: string, current = false): PaginationItem {
  return {
    accessibleLabel: current ? `Current page, page ${label}` : `Go to page ${label}`,
    current,
    href: `/search?page=${label}`,
    id,
    kind: PaginationItemKind.Page,
    label
  };
}

function navigationItem(
  id: string,
  label: string,
  kind: PaginationItemKind,
  pageNumber: number
): PaginationItem {
  return {
    accessibleLabel: `Go to ${label.toLowerCase()} page`,
    href: `/search?page=${pageNumber}`,
    id,
    kind,
    label
  };
}

function root(pagination: UnifoldPagination): ShadowRoot {
  const value = pagination.shadowRoot;
  if (value === null) throw new Error("Pagination shadow root is missing.");
  return value;
}

function control(pagination: UnifoldPagination, index: number): HTMLElement {
  const value = root(pagination).querySelector<HTMLElement>(`[data-pagination-index="${index}"]`);
  if (value === null) throw new Error(`Pagination control ${index} is missing.`);
  return value;
}

function disabledControl(pagination: UnifoldPagination): HTMLButtonElement {
  const value = root(pagination).querySelector<HTMLButtonElement>("button:disabled");
  if (value === null) throw new Error("Disabled Pagination control is missing.");
  return value;
}

function overflow(pagination: UnifoldPagination): HTMLElement {
  const value = root(pagination).querySelector<HTMLElement>("[part=overflow]");
  if (value === null) throw new Error("Pagination overflow item is missing.");
  return value;
}

function requiredElement(pagination: UnifoldPagination, selector: string): HTMLElement {
  const value = root(pagination).querySelector<HTMLElement>(selector);
  if (value === null) throw new Error(`Pagination element ${selector} is missing.`);
  return value;
}

function firstCallEvent(calls: readonly unknown[][]): Event {
  const event = calls[0]?.[0];
  if (!(event instanceof Event)) throw new Error("Pagination event is missing.");
  return event;
}

function assertSafeNoninteractiveMarkup(
  pagination: UnifoldPagination,
  disabled: HTMLButtonElement
): void {
  expect(disabled).toBeInstanceOf(HTMLButtonElement);
  expect(root(pagination).querySelector("img")).toBeNull();
  expect(root(pagination).querySelector('a[href^="javascript"]')).toBeNull();
}

function detail(event: Event): UiEvent {
  return (event as CustomEvent<UiEvent>).detail;
}
