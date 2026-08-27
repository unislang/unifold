import { PaginationItemKind, type PaginationItem } from "@unislang/unifold-catalog";
import { CoreComponentType } from "@unislang/unifold-contracts";
import { UiNodeKind, type UnifoldIrNode } from "@unislang/unifold-ir";
import { expect, it } from "vitest";

import { renderStaticPagination } from "./static-pagination.js";

it("preserves safe native links and current-page semantics", () => {
  const output = renderStaticPagination(paginationNode());
  expect(output).toContain('<nav data-unifold-static-pagination="results-pages"');
  expect(output).toContain('<a href="?page=2" aria-label="Go to page 2">2</a>');
  expect(output).toContain(
    '<span role="link" aria-disabled="true" aria-label="Current page, page 1" aria-current="page">1</span>'
  );
  expect(output).toContain('role="link" aria-disabled="true" aria-label="Previous page"');
});

it("renders href-less and overflow items as noninteractive escaped text", () => {
  const output = renderStaticPagination(paginationNode());
  expect(output).not.toContain("<button");
  expect(output).toContain('data-pagination-item-kind="overflow"');
  expect(output).toContain('&lt;more&gt;</span><span style="position:absolute');
  expect(output).toContain("More pages");
  expect(output).not.toContain('href="javascript:');
});

function paginationNode(): UnifoldIrNode {
  return {
    childIds: [],
    componentType: CoreComponentType.Pagination,
    eventBindings: {},
    id: "results-pages",
    kind: UiNodeKind.Component,
    parentId: "root",
    properties: { items: items(), label: "Search result pages" },
    scopePath: ["results-pages"]
  };
}

function items(): readonly PaginationItem[] {
  return [
    item({ disabled: true, id: "previous", kind: PaginationItemKind.Previous }),
    item({ accessibleLabel: "Current page, page 1", current: true, label: "1" }),
    item({ accessibleLabel: "Go to page 2", href: "?page=2", id: "two", label: "2" }),
    item({
      accessibleLabel: "More pages",
      id: "more",
      kind: PaginationItemKind.Overflow,
      label: "<more>"
    }),
    item({
      accessibleLabel: "Next page",
      href: "?page=2",
      id: "next",
      kind: PaginationItemKind.Next,
      label: "Next"
    })
  ];
}

function item(overrides: Partial<PaginationItem>): PaginationItem {
  return {
    accessibleLabel: "Previous page",
    id: "one",
    kind: PaginationItemKind.Page,
    label: "Previous",
    ...overrides
  };
}
