import type { UnifoldElementHost } from "./types.js";

const TARGET_SELECTOR = "input, select, textarea, button, a[href], [tabindex]";

export function focusRenderedElement(
  element: UnifoldElementHost,
  controlIndex?: number
): HTMLElement | undefined {
  const target = renderedFocusTarget(element, controlIndex);
  if (target === undefined) return undefined;
  return focusElement(target) ? target : undefined;
}

function focusElement(target: HTMLElement): boolean {
  tryFocus(target);
  return deepestActiveElement(target.ownerDocument) === target;
}

export function focusMayBeRetried(
  element: UnifoldElementHost,
  previousTarget: HTMLElement
): boolean {
  const active = deepestActiveElement(element.ownerDocument);
  if (active === previousTarget) return true;
  return !previousTarget.isConnected && isDocumentFallback(active, element.ownerDocument);
}

export function focusMayBeStarted(
  element: UnifoldElementHost,
  previousActive: Element | null
): boolean {
  const active = deepestActiveElement(element.ownerDocument);
  if (active === previousActive) return true;
  return isDocumentFallback(active, element.ownerDocument);
}

function renderedFocusTarget(
  element: UnifoldElementHost,
  controlIndex: number | undefined
): HTMLElement | undefined {
  if (!acceptsFocus(element)) return undefined;
  const own = shadowTarget(element.shadowRoot, controlIndex);
  if (own !== undefined) return own;
  return descendantOrHostTarget(element);
}

function descendantOrHostTarget(element: UnifoldElementHost): HTMLElement | undefined {
  for (const child of childElements(element)) {
    const target = elementFocusTarget(child);
    if (target !== undefined) return target;
  }
  return nativeFocusTarget(element);
}

function elementFocusTarget(element: HTMLElement): HTMLElement | undefined {
  if (!acceptsFocus(element)) return undefined;
  const native = nativeFocusTarget(element);
  if (native !== undefined) return native;
  return renderedFocusTarget(element as UnifoldElementHost, undefined);
}

function shadowTarget(
  root: ShadowRoot | null,
  controlIndex: number | undefined
): HTMLElement | undefined {
  if (root === null) return undefined;
  const targets = [...root.querySelectorAll<HTMLElement>(TARGET_SELECTOR)];
  const indexed = indexedTarget(targets, controlIndex);
  if (indexed !== undefined) return indexed;
  return targets.find(acceptsFocus);
}

function indexedTarget(
  targets: readonly HTMLElement[],
  controlIndex: number | undefined
): HTMLElement | undefined {
  if (controlIndex === undefined) return undefined;
  return enabledTarget(targets[controlIndex]);
}

function enabledTarget(target: HTMLElement | undefined): HTMLElement | undefined {
  if (target === undefined) return undefined;
  return acceptsFocus(target) ? target : undefined;
}

function childElements(element: UnifoldElementHost): readonly HTMLElement[] {
  const container = element.unifoldChildContainer ?? element;
  return [...container.children].filter(
    (child): child is HTMLElement => child instanceof HTMLElement
  );
}

function nativeFocusTarget(element: HTMLElement): HTMLElement | undefined {
  if (!element.matches(TARGET_SELECTOR)) return undefined;
  return acceptsFocus(element) ? element : undefined;
}

function acceptsFocus(element: HTMLElement): boolean {
  if (!element.isConnected) return false;
  return !focusAncestry(element).some(blocksFocus);
}

function focusAncestry(element: HTMLElement): readonly HTMLElement[] {
  const ancestry: HTMLElement[] = [];
  let current: HTMLElement | null = element;
  while (current !== null) {
    ancestry.push(current);
    current = composedParent(current);
  }
  return ancestry;
}

function composedParent(element: HTMLElement): HTMLElement | null {
  if (element.parentElement !== null) return element.parentElement;
  const root = element.getRootNode() as Node & { readonly host?: Element };
  return htmlHost(root.host);
}

function htmlHost(host: Element | undefined): HTMLElement | null {
  return host instanceof HTMLElement ? host : null;
}

function blocksFocus(element: HTMLElement): boolean {
  return isSemanticallyBlocked(element) || isVisuallyBlocked(element);
}

function isSemanticallyBlocked(element: HTMLElement): boolean {
  return [
    element.hidden || element.hasAttribute("inert"),
    element.getAttribute("aria-hidden") === "true",
    element.getAttribute("aria-disabled") === "true",
    element.matches(":disabled, input[type='hidden']")
  ].includes(true);
}

function isVisuallyBlocked(element: HTMLElement): boolean {
  const style = computedStyle(element);
  if (style === undefined) return false;
  return [
    style.display === "none",
    style.visibility === "hidden",
    style.visibility === "collapse",
    style.contentVisibility === "hidden"
  ].includes(true);
}

function computedStyle(element: HTMLElement): CSSStyleDeclaration | undefined {
  try {
    return element.ownerDocument.defaultView?.getComputedStyle(element);
  } catch {
    return undefined;
  }
}

export function deepestActiveElement(document: Document): Element | null {
  let active = document.activeElement;
  let nested = shadowActiveElement(active);
  while (nested instanceof Element) {
    active = nested;
    nested = shadowActiveElement(active);
  }
  return active;
}

function tryFocus(target: HTMLElement): void {
  try {
    target.focus();
  } catch {
    return;
  }
}

function shadowActiveElement(element: Element | null): Element | null {
  if (element === null) return null;
  return activeShadowElement(element);
}

function activeShadowElement(element: Element): Element | null {
  try {
    const root = element.shadowRoot;
    if (root === null) return null;
    return root.activeElement;
  } catch {
    return null;
  }
}

function isDocumentFallback(active: Element | null, document: Document): boolean {
  return active === null || active === document.body || active === document.documentElement;
}
