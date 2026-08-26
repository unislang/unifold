import type { TooltipPlacement } from "@unislang/unifold-catalog";
import type { UiNodeSnapshot, UiRuntimeContext } from "@unislang/unifold-events";

import { TooltipDirection, tooltipPosition } from "./tooltip-position.js";

const template = `
  <style>
    :host{box-sizing:border-box;color:var(--unifold-color-text,#111827);display:inline-block;font-family:var(--unifold-font-sans,ui-sans-serif,system-ui,sans-serif)}
    *{box-sizing:border-box}
    button{appearance:none;background:transparent;border:0;border-block-end:1px dotted currentColor;color:inherit;cursor:help;font:inherit;padding:0}
    button:focus-visible{outline:var(--unifold-focus-width,2px) solid var(--unifold-color-focus,#2563eb);outline-offset:2px}
    [role=tooltip]{background:var(--unifold-color-text,#111827);border:0;border-radius:var(--unifold-radius-md,.5rem);color:var(--unifold-color-surface,#fff);display:none;inset:auto;margin:0;max-width:min(20rem,calc(100vw - 1rem));padding:var(--unifold-space-2,.5rem);position:fixed}
    [role=tooltip][data-open],[role=tooltip]:popover-open{display:block}
  </style>
  <button part="trigger" type="button"></button>
  <span part="tooltip" role="tooltip" popover="manual"></span>
`;

/**
 * Reveals concise non-interactive help from a focusable labeled trigger.
 *
 * @tagname unifold-tooltip
 * @attr {string} data-testid - Stable host test selector supplied by the renderer.
 * @csspart trigger - Native tooltip trigger button.
 * @csspart tooltip - Contextual tooltip surface.
 * @cssprop --unifold-color-surface - Tooltip background.
 * @cssprop --unifold-color-text - Tooltip foreground.
 * @cssprop --unifold-radius-md - Tooltip corner radius.
 * @cssprop --unifold-space-2 - Tooltip padding.
 */
export class UnifoldTooltip extends HTMLElement {
  /** @internal */
  eventNode?: UiNodeSnapshot;
  /** @internal */
  runtimeContext: UiRuntimeContext = { documentId: "unmounted" };
  private contentValue = "";
  private labelValue = "";
  private openValue = false;
  private placementValue: TooltipPlacement = "top" as TooltipPlacement;
  private pointerInside = false;
  private renderCount = 0;
  private updatePending = false;
  private updatePromise: Promise<boolean> = Promise.resolve(true);
  private resolveUpdate: ((value: boolean) => void) | undefined;

  constructor() {
    super();
    this.attachShadow({ mode: "open" }).innerHTML = template;
    this.bindInteractions();
  }

  static get observedAttributes(): readonly string[] {
    return ["content", "id", "label", "placement"];
  }

  get content(): string {
    return this.contentValue;
  }

  set content(value: string) {
    this.contentValue = value;
    this.scheduleUpdate();
  }

  get label(): string {
    return this.labelValue;
  }

  set label(value: string) {
    this.labelValue = value;
    this.scheduleUpdate();
  }

  get open(): boolean {
    return this.openValue;
  }

  set open(value: boolean) {
    if (this.openValue === value) return;
    this.openValue = value;
    this.scheduleUpdate();
  }

  get placement(): TooltipPlacement {
    return this.placementValue;
  }

  set placement(value: TooltipPlacement) {
    this.placementValue = value;
    if (this.getAttribute("placement") !== value) this.setAttribute("placement", value);
    this.scheduleUpdate();
  }

  get updateComplete(): Promise<boolean> {
    return this.updatePromise;
  }

  connectedCallback(): void {
    this.ownerDocument.addEventListener("pointerdown", this.onDocumentPointerDown);
    this.scheduleUpdate();
  }

  disconnectedCallback(): void {
    this.ownerDocument.removeEventListener("pointerdown", this.onDocumentPointerDown);
    this.openValue = false;
  }

  attributeChangedCallback(name: string, _oldValue: string | null, value: string | null): void {
    const setters: Readonly<Record<string, () => void>> = {
      content: () => (this.contentValue = value ?? ""),
      label: () => (this.labelValue = value ?? ""),
      placement: () => this.syncPlacementAttribute(value)
    };
    setters[name]?.();
    this.scheduleUpdate();
  }

  private syncPlacementAttribute(value: string | null): void {
    if (value !== null) this.placementValue = value as TooltipPlacement;
  }

  private bindInteractions(): void {
    const trigger = this.triggerElement();
    const tooltip = this.tooltipElement();
    trigger.addEventListener("blur", this.onBlur);
    trigger.addEventListener("click", this.openTooltip);
    trigger.addEventListener("focus", this.openTooltip);
    trigger.addEventListener("keydown", this.onKeyDown);
    trigger.addEventListener("pointerenter", this.onPointerEnter);
    trigger.addEventListener("pointerleave", this.onPointerLeave);
    tooltip.addEventListener("pointerenter", this.onPointerEnter);
    tooltip.addEventListener("pointerleave", this.onPointerLeave);
  }

  private scheduleUpdate(): void {
    if (this.updatePending) return;
    this.updatePending = true;
    this.updatePromise = new Promise((resolve) => (this.resolveUpdate = resolve));
    queueMicrotask(() => this.render());
  }

  private render(): void {
    const trigger = this.triggerElement();
    const tooltip = this.tooltipElement();
    const tooltipId = `${this.id}__tooltip`;
    trigger.textContent = this.labelValue;
    trigger.setAttribute("aria-describedby", tooltipId);
    tooltip.id = tooltipId;
    tooltip.textContent = this.contentValue;
    tooltip.toggleAttribute("data-open", this.openValue);
    this.syncPopover(tooltip);
    this.renderCount += 1;
    this.dataset["unifoldRenderCount"] = String(this.renderCount);
    this.updatePending = false;
    this.resolveUpdate?.(true);
    this.resolveUpdate = undefined;
  }

  private readonly openTooltip = (): void => {
    this.open = true;
  };

  private readonly onBlur = (): void => {
    if (!this.pointerInside) this.open = false;
  };

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (event.key !== "Escape") return;
    event.stopPropagation();
    this.open = false;
  };

  private readonly onPointerEnter = (): void => {
    this.pointerInside = true;
    this.open = true;
  };

  private readonly onPointerLeave = (): void => {
    this.pointerInside = false;
    if (!this.triggerElement().matches(":focus")) this.open = false;
  };

  private readonly onDocumentPointerDown = (event: Event): void => {
    if (!event.composedPath().includes(this)) this.open = false;
  };

  private syncPopover(tooltip: HTMLElement): void {
    syncPopoverVisibility(tooltip, this.openValue);
    if (!this.openValue) return;
    this.positionTooltip(tooltip);
  }

  private positionTooltip(tooltip: HTMLElement): void {
    const view = this.ownerDocument.defaultView;
    if (view === null) return;
    const position = tooltipPosition(
      this.triggerElement().getBoundingClientRect(),
      tooltip.getBoundingClientRect(),
      this.placementValue,
      { height: view.innerHeight, width: view.innerWidth },
      writingDirection(view, this)
    );
    tooltip.style.left = `${String(position.left)}px`;
    tooltip.style.top = `${String(position.top)}px`;
  }

  private triggerElement(): HTMLButtonElement {
    return requireShadowElement(this.shadowRoot, "button", "Tooltip trigger is missing.");
  }

  private tooltipElement(): HTMLElement {
    return requireShadowElement(this.shadowRoot, "[role=tooltip]", "Tooltip surface is missing.");
  }
}

function syncPopoverVisibility(element: HTMLElement, open: boolean): void {
  const action = open ? showPopover : hidePopover;
  action(element);
}

function writingDirection(view: Window, element: Element): TooltipDirection {
  return view.getComputedStyle(element).direction === TooltipDirection.RightToLeft
    ? TooltipDirection.RightToLeft
    : TooltipDirection.LeftToRight;
}

function requireShadowElement<T extends Element>(
  root: ShadowRoot | null,
  selector: string,
  message: string
): T {
  if (root === null) throw new Error(message);
  const element = root.querySelector<T>(selector);
  if (element === null) throw new Error(message);
  return element;
}

function showPopover(element: HTMLElement): void {
  try {
    showNativePopover(element);
  } catch {
    // The data-open fallback remains authoritative in engines without Popover support.
  }
}

function hidePopover(element: HTMLElement): void {
  try {
    hideNativePopover(element);
  } catch {
    // The data-open fallback remains authoritative in engines without Popover support.
  }
}

function showNativePopover(element: HTMLElement): void {
  if (typeof element.showPopover !== "function") return;
  if (element.matches(":popover-open")) return;
  element.showPopover();
}

function hideNativePopover(element: HTMLElement): void {
  if (typeof element.hidePopover !== "function") return;
  if (!element.matches(":popover-open")) return;
  element.hidePopover();
}
