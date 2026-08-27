// @vitest-environment happy-dom
import { PaginationItemKind, type PaginationItem } from "@unislang/unifold-catalog";
import { CoreComponentType } from "@unislang/unifold-contracts";
import { UiNodeKind, type UnifoldIrNode } from "@unislang/unifold-ir";
import { expect, it } from "vitest";

import { validateStaticPagination } from "./pagination-hydration.js";

it("accepts exact safe-link and noninteractive Pagination fallback semantics", () => {
  const element = fixture();
  expect(() => validateStaticPagination(node(), element, invalid)).not.toThrow();
});

it("rejects item order, destination, current-page, and element drift", () => {
  const mutations = [
    (owner: HTMLElement) => required(owner, "a").setAttribute("href", "?page=3"),
    (owner: HTMLElement) => required(owner, "span").setAttribute("aria-current", "false"),
    (owner: HTMLElement) => required(owner, "li").setAttribute("data-pagination-item-id", "other"),
    (owner: HTMLElement) => required(owner, "span").replaceWith(document.createElement("button"))
  ];
  mutations.forEach((mutate) => {
    const element = fixture();
    mutate(element);
    expect(() => validateStaticPagination(node(), element, invalid)).toThrow("invalid pagination");
  });
});

it("matches arbitrary node and item ids without selector interpolation", () => {
  const nodeId = `pages"] [data-unifold-static-pagination="other`;
  const itemId = `one"] a[href="javascript:alert(1)`;
  const element = fixture();
  element.dataset["unifoldStaticNodeId"] = nodeId;
  required(element, "nav").dataset["unifoldStaticPagination"] = nodeId;
  required(element, "li").dataset["paginationItemId"] = itemId;
  expect(() => validateStaticPagination(node(nodeId, itemId), element, invalid)).not.toThrow();
});

it("accepts exact overflow and disabled-item fallback semantics", () => {
  const overflow = paginationItem({
    accessibleLabel: "More result pages",
    id: "more",
    kind: PaginationItemKind.Overflow,
    label: "…"
  });
  const disabled = paginationItem({ disabled: true, href: "?page=3", id: "three", label: "3" });
  const element = fixtureWithItems(
    '<li data-pagination-item-id="more" data-pagination-item-kind="overflow"><span><span aria-hidden="true">…</span><span>More result pages</span></span></li>' +
      '<li data-pagination-item-id="three" data-pagination-item-kind="page"><span role="link" aria-disabled="true" data-disabled="true" aria-label="Page 3">3</span></li>'
  );
  expect(() =>
    validateStaticPagination(nodeWithItems([overflow, disabled]), element, invalid)
  ).not.toThrow();
});

it("rejects navigation ownership, inventory, and list-shape drift", () => {
  const mutations = [
    (owner: HTMLElement) => required(owner, "nav").setAttribute("aria-label", "Other pages"),
    (owner: HTMLElement) => required(owner, "ul").append(document.createElement("li")),
    (owner: HTMLElement) => required(owner, "ul").replaceWith(document.createElement("ol")),
    (owner: HTMLElement) => required(owner, "nav").after(required(owner, "nav").cloneNode(true))
  ];
  mutations.forEach((mutate) => {
    const element = fixture();
    mutate(element);
    expect(() => validateStaticPagination(node(), element, invalid)).toThrow("invalid pagination");
  });
  const nested = fixture();
  const boundary = document.createElement("div");
  boundary.dataset["unifoldStaticNodeId"] = "nested";
  const navigation = required(nested, "nav");
  navigation.replaceWith(boundary);
  boundary.append(navigation);
  expect(() => validateStaticPagination(node(), nested, invalid)).toThrow("invalid pagination");
});

function fixture(): HTMLElement {
  const element = document.createElement("div");
  element.dataset["unifoldStaticNodeId"] = "pages";
  element.innerHTML = `<nav data-unifold-static-pagination="pages" aria-label="Result pages"><ul><li data-pagination-item-id="one" data-pagination-item-kind="page"><span role="link" aria-disabled="true" aria-label="Current page 1" aria-current="page">1</span></li><li data-pagination-item-id="two" data-pagination-item-kind="page"><a href="?page=2" aria-label="Go to page 2">2</a></li></ul></nav>`;
  return element;
}

function fixtureWithItems(markup: string): HTMLElement {
  const element = document.createElement("div");
  element.dataset["unifoldStaticNodeId"] = "pages";
  element.innerHTML = `<nav data-unifold-static-pagination="pages" aria-label="Result pages"><ul>${markup}</ul></nav>`;
  return element;
}

function node(id = "pages", firstId = "one"): UnifoldIrNode {
  return {
    childIds: [],
    componentType: CoreComponentType.Pagination,
    eventBindings: {},
    id,
    kind: UiNodeKind.Component,
    parentId: "root",
    properties: { items: items(firstId), label: "Result pages" },
    scopePath: [id]
  };
}

function items(firstId: string): readonly PaginationItem[] {
  return [
    {
      accessibleLabel: "Current page 1",
      current: true,
      id: firstId,
      kind: PaginationItemKind.Page,
      label: "1"
    },
    {
      accessibleLabel: "Go to page 2",
      href: "?page=2",
      id: "two",
      kind: PaginationItemKind.Page,
      label: "2"
    }
  ];
}

function nodeWithItems(value: readonly PaginationItem[]): UnifoldIrNode {
  return { ...node(), properties: { items: value, label: "Result pages" } };
}

function paginationItem(overrides: Partial<PaginationItem>): PaginationItem {
  return {
    accessibleLabel: "Page 3",
    id: "page",
    kind: PaginationItemKind.Page,
    label: "3",
    ...overrides
  };
}

function required(owner: HTMLElement, selector: string): HTMLElement {
  const element = owner.querySelector<HTMLElement>(selector);
  if (element === null) throw new Error(`Missing fixture ${selector}.`);
  return element;
}

function invalid(): Error {
  return new Error("invalid pagination");
}
