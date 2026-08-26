import { type MenuItem } from "@unislang/unifold-catalog";
import { type JsonObject } from "@unislang/unifold-contracts";
import { css, html, type PropertyDeclarations, type PropertyValues } from "lit";

import { ElementEventType } from "./enums.js";
import { focusRing, hostDefaults } from "./styles.js";
import { keyboardTabIndex } from "./tab-navigation.js";
import { UnifoldElement } from "./unifold-element.js";

/**
 * Invokes one declared action from a bounded, keyboard-operable menu.
 *
 * @tagname unifold-menu-button
 * @fires unifold-event - Canonical declared menu-item activation intent.
 * @csspart trigger - Native button that controls the menu.
 * @csspart menu - ARIA menu popup.
 * @csspart item - One native button with menuitem semantics.
 */
export class UnifoldMenuButton extends UnifoldElement {
  static override properties: PropertyDeclarations = {
    activeIndex: { attribute: false, state: true },
    disabled: { reflect: true, type: Boolean },
    items: { attribute: false },
    label: {},
    open: { attribute: false, state: true }
  };

  static override styles = [
    hostDefaults,
    focusRing,
    css`
      :host {
        display: inline-block;
        position: relative;
      }
      [part="trigger"],
      [part="item"] {
        font: inherit;
        min-block-size: var(--unifold-control-min-height, 2.75rem);
      }
      [part="trigger"],
      [part="menu"] {
        background: var(--unifold-color-surface, #fff);
        border: 1px solid var(--unifold-color-border, #6b7280);
      }
      [part="menu"] {
        display: grid;
        inset-block-start: 100%;
        inset-inline-start: 0;
        position: absolute;
      }
      [part="menu"][hidden] {
        display: none;
      }
      [part="item"] {
        background: transparent;
        border: 0;
      }
    `
  ];

  declare activeIndex: number;
  declare disabled: boolean;
  declare items: readonly MenuItem[];
  declare label: string;
  declare open: boolean;

  constructor() {
    super();
    this.activeIndex = -1;
    this.disabled = false;
    this.items = [];
    this.label = "";
    this.open = false;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.ownerDocument.addEventListener("pointerdown", this.onDocumentPointerDown, true);
  }

  override disconnectedCallback(): void {
    this.ownerDocument.removeEventListener("pointerdown", this.onDocumentPointerDown, true);
    super.disconnectedCallback();
  }

  protected override willUpdate(changed: PropertyValues): void {
    if (!["items", "disabled"].some((property) => changed.has(property))) return;
    if (menuUnavailable(this.items, this.disabled)) this.open = false;
    this.activeIndex = preferredItemIndex(this.items, this.activeIndex);
  }

  protected override render() {
    return html`
      <button
        part="trigger"
        type="button"
        aria-controls=${menuId(this.id)}
        aria-expanded=${String(this.open)}
        aria-haspopup="menu"
        ?disabled=${this.disabled || firstEnabledIndex(this.items) < 0}
        @click=${this.toggleMenu}
        @keydown=${this.onTriggerKeyDown}
      >
        ${this.label}
      </button>
      <div
        id=${menuId(this.id)}
        part="menu"
        role="menu"
        aria-label=${this.label}
        ?hidden=${!this.open}
        @click=${this.onMenuClick}
        @keydown=${this.onMenuKeyDown}
        @focusout=${this.onFocusOut}
      >
        ${this.items.map((item, index) => this.renderItem(item, index))}
      </div>
    `;
  }

  protected override eventProperties(): JsonObject {
    return { disabled: this.disabled, items: this.items, label: this.label };
  }

  private renderItem(item: MenuItem, index: number) {
    return html`<button
      part="item"
      role="menuitem"
      type="button"
      data-menu-index=${String(index)}
      tabindex=${this.open && index === this.activeIndex ? "0" : "-1"}
      ?disabled=${item.disabled === true}
    >
      ${item.label}
    </button>`;
  }

  private readonly toggleMenu = (): void => {
    if (menuUnavailable(this.items, this.disabled)) return;
    if (this.open) {
      this.closeMenu(false);
      return;
    }
    this.openMenu(firstEnabledIndex(this.items));
  };

  private readonly onTriggerKeyDown = (event: KeyboardEvent): void => {
    if (!["ArrowDown", "ArrowUp"].includes(event.key)) return;
    event.preventDefault();
    const index = keyboardTabIndex(this.items, -1, event.key, true);
    this.openMenu(typeof index === "number" ? index : -1);
  };

  private readonly onMenuKeyDown = (event: KeyboardEvent): void => {
    const dismissal = menuDismissal(event.key);
    if (dismissal !== undefined) {
      preventDefaultForDismissal(event, dismissal);
      this.closeMenu(dismissal);
      return;
    }
    const next = keyboardTabIndex(this.items, this.activeIndex, event.key, true);
    if (!shouldMoveMenuFocus(next, this.activeIndex)) return;
    event.preventDefault();
    this.activeIndex = next;
    void this.updateComplete.then(() => this.focusItem(next));
  };

  private readonly onMenuClick = (event: Event): void => {
    const index = eventMenuIndex(event);
    if (index === undefined) return;
    this.activateItem(index);
  };

  private readonly onFocusOut = (event: FocusEvent): void => {
    if (event.relatedTarget instanceof Node && this.renderRoot.contains(event.relatedTarget))
      return;
    this.closeMenu(false);
  };

  private readonly onDocumentPointerDown = (event: Event): void => {
    if (!this.open || event.composedPath().includes(this)) return;
    this.closeMenu(false);
  };

  private openMenu(index: number): void {
    if (this.disabled || index < 0) return;
    this.activeIndex = index;
    this.open = true;
    void this.updateComplete.then(() => this.focusItem(index));
  }

  private closeMenu(returnFocus: boolean): void {
    if (!this.open) return;
    this.open = false;
    if (returnFocus) void this.updateComplete.then(() => this.focusTrigger());
  }

  private activateItem(index: number): void {
    const item = this.items[index];
    if (item === undefined) return;
    if ([item.disabled === true, this.disabled].includes(true)) return;
    this.emitUiEvent(ElementEventType.ComponentActivated, { itemId: item.value });
    this.closeMenu(true);
  }

  private focusItem(index: number): void {
    this.renderRoot.querySelector<HTMLElement>(`[data-menu-index="${index}"]`)?.focus();
  }

  private focusTrigger(): void {
    this.renderRoot.querySelector<HTMLElement>("[part=trigger]")?.focus();
  }
}

function preferredItemIndex(items: readonly MenuItem[], current: number): number {
  const item = items[current];
  if (item === undefined) return firstEnabledIndex(items);
  return item.disabled === true ? firstEnabledIndex(items) : current;
}

function firstEnabledIndex(items: readonly MenuItem[]): number {
  return items.findIndex(({ disabled }) => disabled !== true);
}

function menuUnavailable(items: readonly MenuItem[], disabled: boolean): boolean {
  return [disabled, firstEnabledIndex(items) < 0].includes(true);
}

function menuDismissal(key: string): boolean | undefined {
  if (key === "Escape") return true;
  if (key === "Tab") return false;
  return undefined;
}

function preventDefaultForDismissal(event: KeyboardEvent, returnFocus: boolean): void {
  if (returnFocus) event.preventDefault();
}

function shouldMoveMenuFocus(next: number | undefined, current: number): next is number {
  return [next !== undefined, Number(next) >= 0, next !== current].every(Boolean);
}

function eventMenuIndex(event: Event): number | undefined {
  const target = (event.target as Element).closest<HTMLElement>("[data-menu-index]");
  const index = Number(target?.dataset["menuIndex"]);
  return Number.isInteger(index) ? index : undefined;
}

function menuId(id: string): string {
  return `${id}__menu`;
}
