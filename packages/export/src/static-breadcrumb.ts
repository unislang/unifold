import { BreadcrumbSeparator, isSafeUrl, type BreadcrumbItem } from "@unislang/unifold-catalog";
import type { UnifoldIrNode } from "@unislang/unifold-ir";

import { escapeHtml } from "./html-escape.js";

interface StaticBreadcrumbContext {
  readonly node: UnifoldIrNode;
}

export function renderStaticBreadcrumb({ node }: StaticBreadcrumbContext): string {
  const items = breadcrumbItems(node);
  const separator = separatorText(stringProperty(node, "separator"));
  const content = items.map((item, index) => renderItem(item, index, items.length, separator));
  return `<nav${attribute("aria-label", stringProperty(node, "label"))}><ol>${content.join("")}</ol></nav>`;
}

function renderItem(item: BreadcrumbItem, index: number, count: number, separator: string): string {
  const current = index === count - 1;
  const content = item.href === undefined ? currentLabel(item, current) : link(item, current);
  const divider = current ? "" : `<span aria-hidden="true">${separator}</span>`;
  return `<li>${content}${divider}</li>`;
}

function currentLabel(item: BreadcrumbItem, current: boolean): string {
  const currentAttribute = current ? ' aria-current="page"' : "";
  return `<span${currentAttribute}>${escapeHtml(item.label)}</span>`;
}

function link(item: BreadcrumbItem, current: boolean): string {
  const href = isSafeUrl(String(item.href)) ? String(item.href) : "#";
  const currentAttribute = current ? ' aria-current="page"' : "";
  return `<a${attribute("href", href)}${currentAttribute}>${escapeHtml(item.label)}</a>`;
}

function breadcrumbItems(node: UnifoldIrNode): readonly BreadcrumbItem[] {
  const value = node.properties["items"];
  return Array.isArray(value) ? (value as unknown as readonly BreadcrumbItem[]) : [];
}

function separatorText(value: string): string {
  return value === BreadcrumbSeparator.Slash ? "/" : "›";
}

function stringProperty(node: UnifoldIrNode, name: string): string {
  const value = node.properties[name];
  return typeof value === "string" ? value : "";
}

function attribute(name: string, value: string): string {
  return ` ${name}="${escapeHtml(value)}"`;
}
