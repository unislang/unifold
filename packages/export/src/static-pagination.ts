import { PaginationItemKind, isSafeUrl, type PaginationItem } from "@unislang/unifold-catalog";
import type { UnifoldIrNode } from "@unislang/unifold-ir";

import { escapeHtml } from "./html-escape.js";

const visuallyHiddenStyle =
  "position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0";

export function renderStaticPagination(node: UnifoldIrNode): string {
  const items = paginationItems(node).map(renderItem).join("");
  return `<nav${attribute("data-unifold-static-pagination", node.id)}${attribute(
    "aria-label",
    stringProperty(node, "label")
  )}><ul>${items}</ul></nav>`;
}

function renderItem(item: PaginationItem): string {
  const marker = `${attribute("data-pagination-item-id", item.id)}${attribute(
    "data-pagination-item-kind",
    item.kind
  )}`;
  return `<li${marker}>${renderControl(item)}</li>`;
}

function renderControl(item: PaginationItem): string {
  if (item.kind === PaginationItemKind.Overflow) return renderOverflow(item);
  const semantics = `${attribute("aria-label", item.accessibleLabel)}${currentAttribute(
    item
  )}${disabledAttribute(item)}`;
  const content = escapeHtml(item.label);
  const href = safeHref(item);
  if (href !== undefined) return `<a${attribute("href", href)}${semantics}>${content}</a>`;
  return `<span role="link" aria-disabled="true"${semantics}>${content}</span>`;
}

function renderOverflow(item: PaginationItem): string {
  return `<span><span aria-hidden="true">${escapeHtml(item.label)}</span><span${attribute(
    "style",
    visuallyHiddenStyle
  )}>${escapeHtml(item.accessibleLabel)}</span></span>`;
}

function currentAttribute(item: PaginationItem): string {
  return item.current === true ? attribute("aria-current", "page") : "";
}

function disabledAttribute(item: PaginationItem): string {
  return item.disabled === true ? attribute("data-disabled", "true") : "";
}

function safeHref(item: PaginationItem): string | undefined {
  if (!isStaticLink(item)) return undefined;
  return item.href;
}

function isStaticLink(item: PaginationItem): item is PaginationItem & { readonly href: string } {
  return [
    item.disabled !== true,
    item.kind !== PaginationItemKind.Overflow,
    typeof item.href === "string",
    isSafeUrl(item.href ?? "")
  ].every(Boolean);
}

function paginationItems(node: UnifoldIrNode): readonly PaginationItem[] {
  const value = node.properties["items"];
  return Array.isArray(value) ? (value as unknown as readonly PaginationItem[]) : [];
}

function stringProperty(node: UnifoldIrNode, name: string): string {
  const value = node.properties[name];
  return typeof value === "string" ? value : "";
}

function attribute(name: string, value: string): string {
  return ` ${name}="${escapeHtml(value)}"`;
}
