import {
  CatalogConstraintKind,
  MAXIMUM_PAGINATION_ITEMS,
  PaginationItemKind,
  isSafeUrl,
  type CatalogConstraintDescriptor,
  type CatalogPaginationDataConstraint,
  type PaginationItem
} from "@unislang/unifold-catalog";

import { errorDiagnostic } from "./diagnostics.js";
import { DiagnosticCode } from "./enums.js";
import { isPlainObject } from "./json-safety.js";
import { isTableIdentifier } from "./table-data-validation.js";
import type { CompilerDiagnostic } from "./types.js";

const itemKeys = new Set(["accessibleLabel", "current", "disabled", "href", "id", "kind", "label"]);

export function isPaginationItemList(value: unknown): value is readonly PaginationItem[] {
  if (!Array.isArray(value)) return false;
  return validItemCount(value.length) && value.every(isPaginationItem);
}

export function validatePaginationDataConstraint(
  node: Readonly<Record<string, unknown>>,
  constraint: CatalogConstraintDescriptor,
  path: string,
  diagnostics: CompilerDiagnostic[]
): void {
  if (constraint.kind !== CatalogConstraintKind.PaginationData) return;
  const items = node[constraint.itemsProperty];
  if (!isPaginationItemList(items)) return;
  reportDuplicateIds(items, constraint, path, nodeId(node), diagnostics);
  reportDuplicateDirectionalKinds(items, constraint, path, nodeId(node), diagnostics);
  reportDirectionalOrder(items, constraint, path, nodeId(node), diagnostics);
  reportCurrentPage(items, constraint, path, nodeId(node), diagnostics);
  reportNoninteractiveItems(items, constraint, path, nodeId(node), diagnostics);
}

function validItemCount(count: number): boolean {
  return count >= 1 && count <= MAXIMUM_PAGINATION_ITEMS;
}

function isPaginationItem(value: unknown): value is PaginationItem {
  if (!isPlainObject(value)) return false;
  return [
    Object.keys(value).every((key) => itemKeys.has(key)),
    isTableIdentifier(value["id"]),
    isItemKind(value["kind"]),
    nonEmptyText(value["label"]),
    nonEmptyText(value["accessibleLabel"]),
    optionalSafeUrl(value["href"]),
    optionalBoolean(value["disabled"]),
    optionalBoolean(value["current"])
  ].every(Boolean);
}

function isItemKind(value: unknown): value is PaginationItemKind {
  return Object.values(PaginationItemKind).includes(value as PaginationItemKind);
}

function nonEmptyText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= 512;
}

function optionalSafeUrl(value: unknown): boolean {
  return value === undefined || (typeof value === "string" && isSafeUrl(value));
}

function optionalBoolean(value: unknown): boolean {
  return value === undefined || typeof value === "boolean";
}

function reportDuplicateIds(
  items: readonly PaginationItem[],
  constraint: CatalogPaginationDataConstraint,
  path: string,
  id: string | undefined,
  diagnostics: CompilerDiagnostic[]
): void {
  const seen = new Set<string>();
  items.forEach((item, index) => {
    if (seen.has(item.id)) {
      diagnostics.push(
        paginationDiagnostic(
          DiagnosticCode.DuplicatePaginationItemId,
          `Pagination item ID "${item.id}" is already defined.`,
          constraint,
          path,
          index,
          "id",
          id
        )
      );
    }
    seen.add(item.id);
  });
}

function reportDuplicateDirectionalKinds(
  items: readonly PaginationItem[],
  constraint: CatalogPaginationDataConstraint,
  path: string,
  id: string | undefined,
  diagnostics: CompilerDiagnostic[]
): void {
  [PaginationItemKind.Previous, PaginationItemKind.Next].forEach((kind) => {
    itemsByKind(items, kind)
      .slice(1)
      .forEach(({ index }) => {
        diagnostics.push(
          paginationDiagnostic(
            DiagnosticCode.DuplicatePaginationItemKind,
            `Pagination can declare at most one ${kind} item.`,
            constraint,
            path,
            index,
            "kind",
            id
          )
        );
      });
  });
}

function itemsByKind(items: readonly PaginationItem[], kind: PaginationItemKind) {
  return items.flatMap((item, index) => (item.kind === kind ? [{ index, item }] : []));
}

function reportDirectionalOrder(
  items: readonly PaginationItem[],
  constraint: CatalogPaginationDataConstraint,
  path: string,
  id: string | undefined,
  diagnostics: CompilerDiagnostic[]
): void {
  reportMisplacedKind(items, PaginationItemKind.Previous, 0, constraint, path, id, diagnostics);
  reportMisplacedKind(
    items,
    PaginationItemKind.Next,
    items.length - 1,
    constraint,
    path,
    id,
    diagnostics
  );
}

function reportMisplacedKind(
  items: readonly PaginationItem[],
  kind: PaginationItemKind,
  expectedIndex: number,
  constraint: CatalogPaginationDataConstraint,
  path: string,
  id: string | undefined,
  diagnostics: CompilerDiagnostic[]
): void {
  itemsByKind(items, kind).forEach(({ index }) => {
    if (index === expectedIndex) return;
    diagnostics.push(
      paginationDiagnostic(
        DiagnosticCode.InvalidPaginationItem,
        `Pagination ${kind} item must be ${kind === PaginationItemKind.Previous ? "first" : "last"}.`,
        constraint,
        path,
        index,
        "kind",
        id
      )
    );
  });
}

function reportCurrentPage(
  items: readonly PaginationItem[],
  constraint: CatalogPaginationDataConstraint,
  path: string,
  id: string | undefined,
  diagnostics: CompilerDiagnostic[]
): void {
  const current = items.flatMap((item, index) => (item.current === true ? [{ index, item }] : []));
  if (current.length === 0) {
    diagnostics.push(
      errorDiagnostic(
        DiagnosticCode.MissingPaginationCurrent,
        "Pagination requires exactly one current page item.",
        `${path}/${constraint.itemsProperty}`,
        id
      )
    );
    return;
  }
  if (current.length > 1) reportMultipleCurrent(current, constraint, path, id, diagnostics);
  current.forEach(({ index, item }) =>
    reportInvalidCurrent(item, index, constraint, path, id, diagnostics)
  );
}

function reportMultipleCurrent(
  current: readonly { readonly index: number }[],
  constraint: CatalogPaginationDataConstraint,
  path: string,
  id: string | undefined,
  diagnostics: CompilerDiagnostic[]
): void {
  current.slice(1).forEach(({ index }) => {
    diagnostics.push(
      paginationDiagnostic(
        DiagnosticCode.InvalidPaginationCurrent,
        "Pagination can declare only one current page item.",
        constraint,
        path,
        index,
        "current",
        id
      )
    );
  });
}

function reportInvalidCurrent(
  item: PaginationItem,
  index: number,
  constraint: CatalogPaginationDataConstraint,
  path: string,
  id: string | undefined,
  diagnostics: CompilerDiagnostic[]
): void {
  if (item.kind !== PaginationItemKind.Page)
    diagnostics.push(invalidCurrentKind(constraint, path, index, id));
  if (item.disabled === true) diagnostics.push(disabledCurrent(constraint, path, index, id));
}

function invalidCurrentKind(
  constraint: CatalogPaginationDataConstraint,
  path: string,
  index: number,
  id: string | undefined
): CompilerDiagnostic {
  return paginationDiagnostic(
    DiagnosticCode.InvalidPaginationCurrent,
    "Only a page item can be current.",
    constraint,
    path,
    index,
    "current",
    id
  );
}

function disabledCurrent(
  constraint: CatalogPaginationDataConstraint,
  path: string,
  index: number,
  id: string | undefined
): CompilerDiagnostic {
  return paginationDiagnostic(
    DiagnosticCode.InvalidPaginationCurrent,
    "The current page item cannot be disabled.",
    constraint,
    path,
    index,
    "disabled",
    id
  );
}

function reportNoninteractiveItems(
  items: readonly PaginationItem[],
  constraint: CatalogPaginationDataConstraint,
  path: string,
  id: string | undefined,
  diagnostics: CompilerDiagnostic[]
): void {
  items.forEach((item, index) => {
    if (!hasForbiddenHref(item)) return;
    diagnostics.push(
      paginationDiagnostic(
        DiagnosticCode.InvalidPaginationItem,
        "Disabled and overflow pagination items cannot declare href.",
        constraint,
        path,
        index,
        "href",
        id
      )
    );
  });
}

function hasForbiddenHref(item: PaginationItem): boolean {
  if (item.href === undefined) return false;
  if (item.kind === PaginationItemKind.Overflow) return true;
  return item.disabled === true;
}

function paginationDiagnostic(
  code: DiagnosticCode,
  message: string,
  constraint: CatalogPaginationDataConstraint,
  path: string,
  index: number,
  property: string,
  id: string | undefined
): CompilerDiagnostic {
  return errorDiagnostic(
    code,
    message,
    `${path}/${constraint.itemsProperty}/${index}/${property}`,
    id
  );
}

function nodeId(node: Readonly<Record<string, unknown>>): string | undefined {
  return typeof node["id"] === "string" ? node["id"] : undefined;
}
