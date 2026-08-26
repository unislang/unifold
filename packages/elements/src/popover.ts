import { TooltipPlacement } from "@unislang/unifold-catalog";
import type { JsonObject } from "@unislang/unifold-contracts";
import { css, html, type PropertyDeclarations, type PropertyValues } from "lit";

import { ElementEventType } from "./enums.js";
import { focusRing, hostDefaults } from "./styles.js";
import { TooltipDirection, tooltipPosition } from "./tooltip-position.js";
import { UnifoldElement } from "./unifold-element.js";

/**
 * Reveals bounded interactive JSON-authored content in a progressively enhanced popover.
 *
 * @tagname unifold-popover
 * @slot - Interactive popover content.
 * @fires unifold-event - Canonical trigger activation intent with the requested open state.
 * @csspart trigger - Native button controlling the surface.
 * @csspart surface - Labeled non-modal dialog surface.
 * @cssprop --unifold-color-border - Popover border color.
 * @cssprop --unifold-color-surface - Popover background.
 * @cssprop --unifold-radius-md - Popover corner radius.
 * @cssprop --unifold-space-3 - Popover padding.
 */
export class UnifoldPopover extends UnifoldElement {
  static override properties: PropertyDeclarations = {
    disabled: { reflect: true, type: Boolean },
    label: {},
    open: { attribute: false, state: true },
    panelLabel: { attribute: "panel-label" },
    placement: {}
  };

  static override styles = [
    hostDefaults,
    focusRing,
    css`
      :host {
        display: inline-block;
      }
      [part="trigger"] {
        font: inherit;
        min-block-size: var(--unifold-control-min-height, 2.75rem);
      }
      [part="surface"] {
        background: var(--unifold-color-surface, #fff);
        border: 1px solid var(--unifold-color-border, #6b7280);
        border-radius: var(--unifold-radius-md, 0.5rem);
        display: none;
        inset: auto;
        margin: 0;
        max-block-size: min(30rem, calc(100vh - 1rem));
        max-inline-size: min(32rem, calc(100vw - 1rem));
        overflow: auto;
        padding: var(--unifold-space-3, 0.75rem);
        position: fixed;
      }
      [part="surface"][data-open],
      [part="surface"]:popover-open {
        display: block;
      }
    `
  ];

  declare disabled: boolean;
  declare label: string;
  declare open: boolean;
  declare panelLabel: string;
  declare placement: TooltipPlacement;
  private returnFocus = false;

  constructor() {
    super();
    this.disabled = false;
    this.label = "";
    this.open = false;
    this.panelLabel = "";
    this.placement = TooltipPlacement.Bottom;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.ownerDocument.addEventListener("pointerdown", this.onDocumentPointerDown, true);
  }

  override disconnectedCallback(): void {
    this.ownerDocument.removeEventListener("pointerdown", this.onDocumentPointerDown, true);
    this.open = false;
    super.disconnectedCallback();
  }

  protected override willUpdate(changed: PropertyValues): void {
    if (changed.has("disabled") && this.disabled) this.open = false;
  }

  protected override render() {
    return html`
      <span @focusout=${this.onFocusOut} @keydown=${this.onKeyDown}>
        <button
          part="trigger"
          type="button"
          aria-controls=${surfaceId(this.id)}
          aria-expanded=${String(this.open)}
          aria-haspopup="dialog"
          ?disabled=${this.disabled}
          @click=${this.onTriggerClick}
        >
          ${this.label}
        </button>
        <section
          id=${surfaceId(this.id)}
          part="surface"
          role="dialog"
          aria-label=${this.panelLabel}
          popover="auto"
          tabindex="-1"
          ?data-open=${this.open}
          ?hidden=${!this.open}
          @toggle=${this.onNativeToggle}
        >
          <slot></slot>
        </section>
      </span>
    `;
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed);
    if (!changed.has("open")) return;
    this.syncSurface();
  }

  protected override eventProperties(): JsonObject {
    return {
      disabled: this.disabled,
      label: this.label,
      panelLabel: this.panelLabel,
      placement: this.placement
    };
  }

  private readonly onTriggerClick = (): void => {
    if (this.disabled) return;
    const open = !this.open;
    this.returnFocus = !open;
    this.open = open;
    this.emitUiEvent(ElementEventType.ComponentActivated, { open });
  };

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (event.key !== "Escape" || !this.open) return;
    event.preventDefault();
    event.stopPropagation();
    this.close(true);
  };

  private readonly onFocusOut = (event: FocusEvent): void => {
    if (isWithin(this, this.renderRoot, event.relatedTarget)) return;
    this.close(false);
  };

  private readonly onDocumentPointerDown = (event: Event): void => {
    if (!this.open || event.composedPath().includes(this)) return;
    this.close(false);
  };

  private readonly onNativeToggle = (event: Event): void => {
    if (toggleState(event) !== "closed" || !this.open) return;
    this.close(false);
  };

  private close(returnFocus: boolean): void {
    if (!this.open) return;
    this.returnFocus = returnFocus;
    this.open = false;
  }

  private syncSurface(): void {
    const surface = this.surface();
    syncNativePopover(surface, this.open);
    if (this.open) {
      positionSurface(this, surface, this.placement);
      surface.focus();
      return;
    }
    if (this.returnFocus) this.trigger().focus();
    this.returnFocus = false;
  }

  private surface(): HTMLElement {
    return requireElement(this.renderRoot, "[part=surface]", "Popover surface is missing.");
  }

  private trigger(): HTMLButtonElement {
    return requireElement(this.renderRoot, "[part=trigger]", "Popover trigger is missing.");
  }
}

function syncNativePopover(element: HTMLElement, open: boolean): void {
  try {
    const action = open ? showNativePopover : hideNativePopover;
    action(element);
  } catch {
    // data-open and hidden remain the deterministic fallback.
  }
}

function showNativePopover(element: HTMLElement): void {
  if (typeof element.showPopover !== "function") return;
  if (!element.matches(":popover-open")) element.showPopover();
}

function hideNativePopover(element: HTMLElement): void {
  if (typeof element.hidePopover !== "function") return;
  if (element.matches(":popover-open")) element.hidePopover();
}

function positionSurface(
  host: HTMLElement,
  surface: HTMLElement,
  placement: TooltipPlacement
): void {
  const view = host.ownerDocument.defaultView;
  if (view === null) return;
  const position = tooltipPosition(
    requireElement(
      host.shadowRoot,
      "[part=trigger]",
      "Popover trigger is missing."
    ).getBoundingClientRect(),
    surface.getBoundingClientRect(),
    placement,
    { height: view.innerHeight, width: view.innerWidth },
    writingDirection(view, host)
  );
  surface.style.left = `${String(position.left)}px`;
  surface.style.top = `${String(position.top)}px`;
}

function writingDirection(view: Window, element: Element): TooltipDirection {
  return view.getComputedStyle(element).direction === TooltipDirection.RightToLeft
    ? TooltipDirection.RightToLeft
    : TooltipDirection.LeftToRight;
}

function isWithin(host: Node, root: Node, candidate: EventTarget | null): boolean {
  if (!(candidate instanceof Node)) return false;
  return host.contains(candidate) || root.contains(candidate);
}

function toggleState(event: Event): string | undefined {
  return Reflect.get(event, "newState") as string | undefined;
}

function surfaceId(id: string): string {
  return `${id}__popover`;
}

function requireElement<T extends Element>(
  root: ParentNode | null,
  selector: string,
  message: string
): T {
  if (root === null) throw new Error(message);
  const element = root.querySelector<T>(selector);
  if (element === null) throw new Error(message);
  return element;
}
