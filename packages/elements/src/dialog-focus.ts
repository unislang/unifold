const focusableSelector =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

export function dialogTabStops(
  dialog: HTMLElement,
  dismiss: HTMLButtonElement
): readonly HTMLElement[] {
  const stops = [dismiss];
  for (const child of dialog.children) collectFocusable(child, stops);
  return stops;
}

export function adjacentDialogTabIndex(current: number, count: number, backwards: boolean): number {
  if (count === 0) return 0;
  const offset = backwards ? -1 : 1;
  return (tabOrigin(current, backwards) + offset + count) % count;
}

function collectFocusable(element: Element, stops: HTMLElement[]): void {
  if (isFocusable(element)) stops.push(element);
  if (element.shadowRoot !== null) collectFocusableChildren(element.shadowRoot, stops);
  collectFocusableChildren(element, stops);
}

function collectFocusableChildren(parent: ParentNode, stops: HTMLElement[]): void {
  for (const child of parent.childNodes) {
    if (child instanceof Element) collectFocusable(child, stops);
  }
}

function isFocusable(element: Element): element is HTMLElement {
  return (
    element instanceof HTMLElement && element.matches(focusableSelector) && isRendered(element)
  );
}

function isRendered(element: HTMLElement): boolean {
  return !hasHiddenComposedAncestor(element);
}

function hasHiddenComposedAncestor(element: HTMLElement): boolean {
  let candidate: HTMLElement | null = element;
  while (candidate !== null) {
    if (isHidden(candidate)) return true;
    candidate = composedParent(candidate);
  }
  return false;
}

function isHidden(element: HTMLElement): boolean {
  if (element.hidden || element.inert || element.getAttribute("aria-hidden") === "true")
    return true;
  const style = element.ownerDocument.defaultView?.getComputedStyle(element);
  return style?.display === "none" || style?.visibility === "hidden";
}

function composedParent(element: HTMLElement): HTMLElement | null {
  if (element.parentElement !== null) return element.parentElement;
  return shadowHost(element.getRootNode());
}

function shadowHost(root: Node): HTMLElement | null {
  if (!(root instanceof ShadowRoot)) return null;
  return root.host instanceof HTMLElement ? root.host : null;
}

function tabOrigin(current: number, backwards: boolean): number {
  if (current >= 0) return current;
  return backwards ? 0 : -1;
}
