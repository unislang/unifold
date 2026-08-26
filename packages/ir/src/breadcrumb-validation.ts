import {
  CatalogConstraintKind,
  MAXIMUM_BREADCRUMB_ITEMS,
  isSafeUrl,
  type BreadcrumbItem,
  type CatalogBreadcrumbDataConstraint,
  type CatalogConstraintDescriptor
} from "@unislang/unifold-catalog";

import { errorDiagnostic } from "./diagnostics.js";
import { DiagnosticCode } from "./enums.js";
import { isPlainObject } from "./json-safety.js";
import { isTableIdentifier } from "./table-data-validation.js";
import type { CompilerDiagnostic } from "./types.js";

const itemKeys = new Set(["href", "id", "label"]);

export function isBreadcrumbItemList(value: unknown): value is readonly BreadcrumbItem[] {
  if (!Array.isArray(value)) return false;
  return [
    value.length >= 1,
    value.length <= MAXIMUM_BREADCRUMB_ITEMS,
    value.every(isBreadcrumbItem)
  ].every(Boolean);
}

export function validateBreadcrumbDataConstraint(
  node: Readonly<Record<string, unknown>>,
  constraint: CatalogConstraintDescriptor,
  path: string,
  diagnostics: CompilerDiagnostic[]
): void {
  if (constraint.kind !== CatalogConstraintKind.BreadcrumbData) return;
  const items = node[constraint.itemsProperty];
  if (!isBreadcrumbItemList(items)) return;
  reportDuplicates(items, constraint, path, nodeId(node), diagnostics);
  reportMissingAncestorUrls(items, constraint, path, nodeId(node), diagnostics);
}

function isBreadcrumbItem(value: unknown): value is BreadcrumbItem {
  if (!isPlainObject(value)) return false;
  return [
    isTableIdentifier(value["id"]),
    nonEmptyLabel(value["label"]),
    optionalSafeUrl(value["href"]),
    Object.keys(value).every((key) => itemKeys.has(key))
  ].every(Boolean);
}

function nonEmptyLabel(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0 && value.length <= 512;
}

function optionalSafeUrl(value: unknown): boolean {
  return value === undefined || (typeof value === "string" && isSafeUrl(value));
}

function reportDuplicates(
  items: readonly BreadcrumbItem[],
  constraint: CatalogBreadcrumbDataConstraint,
  path: string,
  id: string | undefined,
  diagnostics: CompilerDiagnostic[]
): void {
  const seen = new Set<string>();
  items.forEach((item, index) => {
    if (seen.has(item.id))
      diagnostics.push(duplicateDiagnostic(item.id, index, constraint, path, id));
    seen.add(item.id);
  });
}

function reportMissingAncestorUrls(
  items: readonly BreadcrumbItem[],
  constraint: CatalogBreadcrumbDataConstraint,
  path: string,
  id: string | undefined,
  diagnostics: CompilerDiagnostic[]
): void {
  items.slice(0, -1).forEach((item, index) => {
    if (item.href === undefined)
      diagnostics.push(missingUrlDiagnostic(item.id, index, constraint, path, id));
  });
}

function duplicateDiagnostic(
  itemId: string,
  index: number,
  constraint: CatalogBreadcrumbDataConstraint,
  path: string,
  nodeId: string | undefined
): CompilerDiagnostic {
  return errorDiagnostic(
    DiagnosticCode.DuplicateBreadcrumbItemId,
    `Breadcrumb item ID "${itemId}" is already defined.`,
    `${path}/${constraint.itemsProperty}/${index}/id`,
    nodeId
  );
}

function missingUrlDiagnostic(
  itemId: string,
  index: number,
  constraint: CatalogBreadcrumbDataConstraint,
  path: string,
  nodeId: string | undefined
): CompilerDiagnostic {
  return errorDiagnostic(
    DiagnosticCode.MissingBreadcrumbAncestorHref,
    `Breadcrumb ancestor "${itemId}" requires a safe href.`,
    `${path}/${constraint.itemsProperty}/${index}/href`,
    nodeId
  );
}

function nodeId(node: Readonly<Record<string, unknown>>): string | undefined {
  return typeof node["id"] === "string" ? node["id"] : undefined;
}
