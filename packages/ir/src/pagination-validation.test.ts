import {
  CatalogConstraintKind,
  PaginationItemKind,
  type CatalogPaginationDataConstraint,
  type PaginationItem
} from "@unislang/unifold-catalog";
import { expect, it } from "vitest";

import { DiagnosticCode } from "./enums.js";
import { isPaginationItemList, validatePaginationDataConstraint } from "./pagination-validation.js";
import type { CompilerDiagnostic } from "./types.js";

const constraint: CatalogPaginationDataConstraint = {
  itemsProperty: "items",
  kind: CatalogConstraintKind.PaginationData
};

it("accepts bounded explicit Pagination items", () => {
  expect(isPaginationItemList(validItems())).toBe(true);
  expect(validate(validItems())).toEqual([]);
});

it("rejects malformed item shapes, unsafe links, and unbounded lists", () => {
  expect(isPaginationItemList("items")).toBe(false);
  expect(isPaginationItemList([])).toBe(false);
  expect(isPaginationItemList([null])).toBe(false);
  expect(isPaginationItemList([item({ id: "" })])).toBe(false);
  expect(isPaginationItemList([item({ label: " " })])).toBe(false);
  expect(isPaginationItemList([item({ accessibleLabel: "x".repeat(513) })])).toBe(false);
  expect(isPaginationItemList([item({ href: "javascript:alert(1)" })])).toBe(false);
  expect(isPaginationItemList([item({ kind: "unknown" as PaginationItemKind })])).toBe(false);
  expect(isPaginationItemList([{ ...item(), extra: true }])).toBe(false);
  expect(
    isPaginationItemList(Array.from({ length: 101 }, (_, index) => item({ id: `p-${index}` })))
  ).toBe(false);
});

it("reports duplicate identities and directional kinds", () => {
  const items = [
    item({ current: true, id: "page" }),
    item({ id: "page" }),
    item({ id: "next-1", kind: PaginationItemKind.Next }),
    item({ id: "next-2", kind: PaginationItemKind.Next })
  ];

  expect(codes(validate(items))).toEqual([
    DiagnosticCode.DuplicatePaginationItemId,
    DiagnosticCode.DuplicatePaginationItemKind,
    DiagnosticCode.InvalidPaginationItem
  ]);
});

it("requires Previous first and Next last when authored", () => {
  const items = [
    item({ current: true }),
    item({ id: "previous", kind: PaginationItemKind.Previous }),
    item({ id: "next", kind: PaginationItemKind.Next }),
    item({ id: "last" })
  ];

  expect(codes(validate(items))).toEqual([
    DiagnosticCode.InvalidPaginationItem,
    DiagnosticCode.InvalidPaginationItem
  ]);
});

it("requires exactly one enabled current Page", () => {
  expect(codes(validate([item()]))).toEqual([DiagnosticCode.MissingPaginationCurrent]);
  expect(codes(validate([item({ current: true }), item({ current: true, id: "two" })]))).toEqual([
    DiagnosticCode.InvalidPaginationCurrent
  ]);
  expect(codes(validate([item({ current: true, kind: PaginationItemKind.Previous })]))).toEqual([
    DiagnosticCode.InvalidPaginationCurrent
  ]);
  expect(codes(validate([item({ current: true, disabled: true })]))).toEqual([
    DiagnosticCode.InvalidPaginationCurrent
  ]);
});

it("keeps disabled and overflow items noninteractive", () => {
  const items = [
    item({ current: true }),
    item({ disabled: true, href: "?page=2", id: "disabled" }),
    item({ href: "?page=3", id: "overflow", kind: PaginationItemKind.Overflow })
  ];

  expect(codes(validate(items))).toEqual([
    DiagnosticCode.InvalidPaginationItem,
    DiagnosticCode.InvalidPaginationItem
  ]);
});

function validItems(): readonly PaginationItem[] {
  return [
    item({ disabled: true, id: "previous", kind: PaginationItemKind.Previous, label: "Previous" }),
    item({ current: true, href: "?page=1" }),
    item({ href: "?page=2", id: "next", kind: PaginationItemKind.Next, label: "Next" })
  ];
}

function item(overrides: Partial<PaginationItem> = {}): PaginationItem {
  return {
    accessibleLabel: "Results page 1",
    id: "page-1",
    kind: PaginationItemKind.Page,
    label: "1",
    ...overrides
  };
}

function validate(items: readonly PaginationItem[]): CompilerDiagnostic[] {
  const diagnostics: CompilerDiagnostic[] = [];
  validatePaginationDataConstraint({ id: "pages", items }, constraint, "/view", diagnostics);
  return diagnostics;
}

function codes(diagnostics: readonly CompilerDiagnostic[]) {
  return diagnostics.map(({ code }) => code);
}
