import type { UnifoldElementHost } from "./types.js";

const TARGET_SELECTOR = "input, select, textarea, button, a[href], [tabindex]";

export function focusRenderedElement(
  element: UnifoldElementHost,
  controlIndex?: number
): HTMLElement | undefined {
  const target = renderedFocusTarget(element, controlIndex);
  target?.focus();
  return target;
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
  const active = element.ownerDocument.activeElement;
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
  if (isSelfBlocked(element)) return false;
  return !isAncestorBlocked(element);
}

function isSelfBlocked(element: HTMLElement): boolean {
  return element.hidden || element.matches(":disabled");
}

function isAncestorBlocked(element: HTMLElement): boolean {
  if (element.closest("[inert], [hidden]") !== null) return true;
  return element.getAttribute("aria-hidden") === "true";
}

function deepestActiveElement(document: Document): Element | null {
  let active = document.activeElement;
  let nested = shadowActiveElement(active);
  while (nested instanceof Element) {
    active = nested;
    nested = shadowActiveElement(active);
  }
  return active;
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
