import type { UnifoldIrNode } from "@unislang/unifold-ir";

type HydrationErrorFactory = () => Error;

const urgentStatuses = new Set(["warning", "error"]);

export function validateStaticToast(
  node: UnifoldIrNode,
  element: HTMLElement,
  invalid: HydrationErrorFactory
): void {
  const surface = exactMarkedElement(
    element,
    "[data-unifold-static-toast]",
    "unifoldStaticToast",
    node.id,
    invalid
  );
  assertOwnedSurface(surface, element, invalid);
  if (!matchesSurface(node, surface)) throw invalid();
  validateToastContent(node, surface, invalid);
}

function validateToastContent(
  node: UnifoldIrNode,
  surface: HTMLElement,
  invalid: HydrationErrorFactory
): void {
  if (!booleanProperty(node, "visible", true)) return validateHiddenSurface(surface, invalid);
  const announcement = exactMarkedElement(
    surface,
    "[data-unifold-static-toast-announcement]",
    "unifoldStaticToastAnnouncement",
    node.id,
    invalid
  );
  assertDirectAnnouncement(announcement, surface, invalid);
  if (!matchesAnnouncement(node, announcement)) throw invalid();
}

function validateHiddenSurface(surface: HTMLElement, invalid: HydrationErrorFactory): void {
  if (surface.children.length !== 0 || !surface.hidden) throw invalid();
}

function assertOwnedSurface(
  surface: HTMLElement,
  owner: HTMLElement,
  invalid: HydrationErrorFactory
): void {
  if (surface.closest("[data-unifold-static-node-id]") !== owner) throw invalid();
}

function assertDirectAnnouncement(
  announcement: HTMLElement,
  surface: HTMLElement,
  invalid: HydrationErrorFactory
): void {
  if (announcement.parentElement !== surface) throw invalid();
}

function matchesSurface(node: UnifoldIrNode, surface: HTMLElement): boolean {
  return [
    surface.dataset["status"] === status(node),
    surface.dataset["variant"] === variant(node),
    surface.dataset["visible"] === String(booleanProperty(node, "visible", true)),
    surface.children.length === expectedChildCount(node)
  ].every(Boolean);
}

function expectedChildCount(node: UnifoldIrNode): number {
  return booleanProperty(node, "visible", true) ? 1 : 0;
}

function matchesAnnouncement(node: UnifoldIrNode, announcement: HTMLElement): boolean {
  const expectedRole = urgentStatuses.has(status(node)) ? "alert" : "status";
  const children = [...announcement.children];
  return [
    announcement.getAttribute("role") === expectedRole,
    announcement.getAttribute("aria-atomic") === "true",
    children.length === 2,
    matchesText(children[0], "STRONG", stringProperty(node, "label")),
    matchesText(children[1], "SPAN", stringProperty(node, "message"))
  ].every(Boolean);
}

function exactMarkedElement(
  owner: HTMLElement,
  selector: string,
  marker: string,
  id: string,
  invalid: HydrationErrorFactory
): HTMLElement {
  const matches = [...owner.querySelectorAll<HTMLElement>(selector)].filter(
    (candidate) => candidate.dataset[marker] === id
  );
  if (matches.length !== 1) throw invalid();
  return matches[0] as HTMLElement;
}

function matchesText(element: Element | undefined, tag: string, text: string): boolean {
  return element?.tagName === tag && element.textContent === text;
}

function status(node: UnifoldIrNode): string {
  return enumProperty(node, "status", ["info", "success", "warning", "error"], "info");
}

function variant(node: UnifoldIrNode): string {
  return enumProperty(node, "variant", ["subtle", "solid"], "subtle");
}

function enumProperty(
  node: UnifoldIrNode,
  name: string,
  values: readonly string[],
  fallback: string
): string {
  const value = node.properties[name];
  return typeof value === "string" && values.includes(value) ? value : fallback;
}

function stringProperty(node: UnifoldIrNode, name: string): string {
  const value = node.properties[name];
  return typeof value === "string" ? value : "";
}

function booleanProperty(node: UnifoldIrNode, name: string, fallback: boolean): boolean {
  const value = node.properties[name];
  return typeof value === "boolean" ? value : fallback;
}
