import {
  CatalogConstraintKind,
  type CatalogBreadcrumbDataConstraint
} from "@unislang/unifold-catalog";
import { expect, it } from "vitest";

import { isBreadcrumbItemList, validateBreadcrumbDataConstraint } from "./breadcrumb-validation.js";
import { DiagnosticCode } from "./enums.js";
import type { CompilerDiagnostic } from "./types.js";

const constraint: CatalogBreadcrumbDataConstraint = {
  itemsProperty: "items",
  kind: CatalogConstraintKind.BreadcrumbData
};

it("accepts safe ordered Breadcrumb items with an optional final URL", () => {
  expect(isBreadcrumbItemList(validItems())).toBe(true);
  expect(validate(validItems())).toEqual([]);
  expect(validate(validItems("#current"))).toEqual([]);
});

it("rejects malformed, unsafe, empty, and oversized item lists", () => {
  expect(isBreadcrumbItemList("not-an-array")).toBe(false);
  expect(isBreadcrumbItemList([])).toBe(false);
  expect(isBreadcrumbItemList(["not-an-object"])).toBe(false);
  expect(isBreadcrumbItemList([{ href: "/", id: "", label: "Home" }])).toBe(false);
  expect(isBreadcrumbItemList([{ id: "home", label: "", href: "/" }])).toBe(false);
  expect(isBreadcrumbItemList([{ id: "home", label: "x".repeat(513), href: "/" }])).toBe(false);
  expect(isBreadcrumbItemList([{ id: "home", label: "Home", href: 1 }])).toBe(false);
  expect(isBreadcrumbItemList([{ id: "home", label: "Home", href: "javascript:alert(1)" }])).toBe(
    false
  );
  expect(isBreadcrumbItemList([{ extra: true, href: "/", id: "home", label: "Home" }])).toBe(false);
  expect(isBreadcrumbItemList(Array.from({ length: 33 }, itemAt))).toBe(false);
});

it("ignores unrelated constraints and retains diagnostics without an optional node ID", () => {
  const diagnostics: CompilerDiagnostic[] = [];
  validateBreadcrumbDataConstraint(
    { items: validItems() },
    { kind: CatalogConstraintKind.ChildCount, maximum: 3, minimum: 0 },
    "/view",
    diagnostics
  );
  validateBreadcrumbDataConstraint(
    {
      items: [
        { id: "home", label: "Home" },
        { id: "current", label: "Current" }
      ]
    },
    constraint,
    "/view",
    diagnostics
  );
  expect(diagnostics).toMatchObject([{ code: DiagnosticCode.MissingBreadcrumbAncestorHref }]);
  expect(diagnostics[0]).not.toHaveProperty("nodeId");
});

it("reports duplicate IDs and missing ancestor URLs at exact item paths", () => {
  const diagnostics = validate([
    { id: "home", label: "Home" },
    { href: "/accounts", id: "home", label: "Accounts" },
    { id: "current", label: "Current" }
  ]);
  expect(diagnostics.map(({ code, path }) => ({ code, path }))).toEqual([
    { code: DiagnosticCode.DuplicateBreadcrumbItemId, path: "/view/items/1/id" },
    { code: DiagnosticCode.MissingBreadcrumbAncestorHref, path: "/view/items/0/href" }
  ]);
});

function validate(items: unknown): CompilerDiagnostic[] {
  const diagnostics: CompilerDiagnostic[] = [];
  validateBreadcrumbDataConstraint({ id: "trail", items }, constraint, "/view", diagnostics);
  return diagnostics;
}

function validItems(currentHref?: string) {
  const current = { id: "current", label: "Current" };
  return [
    { href: "/", id: "home", label: "Home" },
    currentHref === undefined ? current : { ...current, href: currentHref }
  ];
}

function itemAt(_: unknown, index: number) {
  return { href: `/${String(index)}`, id: `item-${String(index)}`, label: `Item ${String(index)}` };
}
