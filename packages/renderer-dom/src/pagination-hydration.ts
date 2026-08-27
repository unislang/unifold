import type { PaginationItem } from "@unislang/unifold-catalog";
import type { UnifoldIrNode } from "@unislang/unifold-ir";

type HydrationErrorFactory = () => Error;
const safeProtocols = new Set(["http:", "https:", "mailto:", "tel:"]);

export function validateStaticPagination(
  node: UnifoldIrNode,
  element: HTMLElement,
  invalid: HydrationErrorFactory
): void {
  const navigation = exactNavigation(element, node.id, invalid);
  if (navigation.closest("[data-unifold-static-node-id]") !== element) throw invalid();
  if (navigation.getAttribute("aria-label") !== stringProperty(node, "label")) throw invalid();
  validateItems(navigation, paginationItems(node), invalid);
}

function exactNavigation(
  owner: HTMLElement,
  id: string,
  invalid: HydrationErrorFactory
): HTMLElement {
  const matches = [
    ...owner.querySelectorAll<HTMLElement>("[data-unifold-static-pagination]")
  ].filter((candidate) => candidate.dataset["unifoldStaticPagination"] === id);
  if (matches.length !== 1) throw invalid();
  return matches[0] as HTMLElement;
}

function validateItems(
  navigation: HTMLElement,
  items: readonly PaginationItem[],
  invalid: HydrationErrorFactory
): void {
  const list = exactList(navigation, invalid);
  const rendered = [...list.children];
  if (rendered.length !== items.length) throw invalid();
  items.forEach((item, index) => validateItem(rendered[index], item, invalid));
}

function exactList(navigation: HTMLElement, invalid: HydrationErrorFactory): HTMLUListElement {
  const children = [...navigation.children];
  if (children.length !== 1 || !(children[0] instanceof HTMLUListElement)) throw invalid();
  return children[0];
}

function validateItem(
  rendered: Element | undefined,
  item: PaginationItem,
  invalid: HydrationErrorFactory
): void {
  if (!isMatchingItem(rendered, item)) throw invalid();
  const control = exactControl(rendered, invalid);
  if (!matchesControl(control, item)) throw invalid();
}

function isMatchingItem(
  rendered: Element | undefined,
  item: PaginationItem
): rendered is HTMLLIElement {
  return rendered instanceof HTMLLIElement && matchesItem(rendered, item);
}

function matchesItem(rendered: HTMLLIElement, item: PaginationItem): boolean {
  return [
    rendered.dataset["paginationItemId"] === item.id,
    rendered.dataset["paginationItemKind"] === item.kind
  ].every(Boolean);
}

function exactControl(item: HTMLLIElement, invalid: HydrationErrorFactory): HTMLElement {
  const children = [...item.children];
  if (children.length !== 1 || !(children[0] instanceof HTMLElement)) throw invalid();
  return children[0];
}

function matchesControl(control: HTMLElement, item: PaginationItem): boolean {
  if (item.kind === "overflow") return matchesOverflow(control, item);
  return [
    control.tagName === expectedTag(item),
    control.textContent === item.label,
    control.getAttribute("aria-label") === item.accessibleLabel,
    control.getAttribute("aria-current") === expectedCurrent(item),
    control.getAttribute("role") === expectedRole(item),
    control.getAttribute("aria-disabled") === expectedAriaDisabled(item),
    control.getAttribute("data-disabled") === expectedDataDisabled(item),
    control.getAttribute("href") === safeHref(item)
  ].every(Boolean);
}

function matchesOverflow(control: HTMLElement, item: PaginationItem): boolean {
  const children = [...control.children];
  return [
    control.tagName === "SPAN",
    children.length === 2,
    control.getAttribute("href") === null,
    control.getAttribute("role") === null,
    control.getAttribute("aria-current") === null,
    control.getAttribute("aria-disabled") === null,
    matchesText(children[0], item.label, "true"),
    matchesText(children[1], item.accessibleLabel, null)
  ].every(Boolean);
}

function matchesText(element: Element | undefined, text: string, hidden: string | null): boolean {
  if (!(element instanceof HTMLSpanElement)) return false;
  return [element.textContent === text, element.getAttribute("aria-hidden") === hidden].every(
    Boolean
  );
}

function expectedTag(item: PaginationItem): "A" | "SPAN" {
  return safeHref(item) === null ? "SPAN" : "A";
}

function expectedCurrent(item: PaginationItem): string | null {
  return item.current === true ? "page" : null;
}

function expectedRole(item: PaginationItem): string | null {
  return safeHref(item) === null ? "link" : null;
}

function expectedAriaDisabled(item: PaginationItem): string | null {
  return safeHref(item) === null ? "true" : null;
}

function expectedDataDisabled(item: PaginationItem): string | null {
  return item.disabled === true ? "true" : null;
}

function safeHref(item: PaginationItem): string | null {
  if (!isStaticLink(item)) return null;
  return item.href;
}

function isStaticLink(item: PaginationItem): item is PaginationItem & { readonly href: string } {
  return [
    item.disabled !== true,
    item.kind !== "overflow",
    typeof item.href === "string",
    isSafeHydrationUrl(item.href ?? "")
  ].every(Boolean);
}

function isSafeHydrationUrl(value: string): boolean {
  try {
    return safeProtocols.has(new URL(value, "https://unifold.invalid/").protocol);
  } catch {
    return false;
  }
}

function paginationItems(node: UnifoldIrNode): readonly PaginationItem[] {
  const value = node.properties["items"];
  return Array.isArray(value) ? (value as unknown as readonly PaginationItem[]) : [];
}

function stringProperty(node: UnifoldIrNode, name: string): string {
  const value = node.properties[name];
  return typeof value === "string" ? value : "";
}
