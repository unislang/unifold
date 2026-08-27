import { PaginationItemKind, isSafeUrl, type PaginationItem } from "@unislang/unifold-catalog";
import type { JsonObject } from "@unislang/unifold-contracts";
import { css, html, nothing, type PropertyDeclarations } from "lit";

import { ElementEventType } from "./enums.js";
import { focusRing, hostDefaults } from "./styles.js";
import { UnifoldElement } from "./unifold-element.js";

/**
 * Presents one controlled, explicitly authored pagination sequence.
 *
 * @tagname unifold-pagination
 * @fires unifold-event - Canonical pagination-item activation intent.
 * @csspart navigation - Labelled native pagination landmark.
 * @csspart list - Ordered pagination item list.
 * @csspart item - One pagination list item.
 * @csspart control - One native page, previous, or next control.
 * @csspart current - The current page control.
 * @csspart overflow - One noninteractive range omission.
 * @cssprop --unifold-color-primary - Control accent color.
 * @cssprop --unifold-color-surface - Control background.
 * @cssprop --unifold-color-border - Control border color.
 * @cssprop --unifold-control-min-height - Minimum control target size.
 * @cssprop --unifold-radius-sm - Control corner radius.
 * @cssprop --unifold-space-1 - Compact list spacing.
 * @cssprop --unifold-space-2 - Control padding.
 */
export class UnifoldPagination extends UnifoldElement {
  static override properties: PropertyDeclarations = {
    items: { attribute: false },
    label: {}
  };

  static override styles = [
    hostDefaults,
    focusRing,
    css`
      :host {
        display: block;
      }
      [part="navigation"] {
        overflow-x: auto;
        padding: var(--unifold-focus-width, 3px);
      }
      [part="list"] {
        align-items: center;
        display: flex;
        flex-wrap: nowrap;
        gap: var(--unifold-space-1, 0.25rem);
        list-style: none;
        margin: 0;
        padding: 0;
      }
      [part~="control"] {
        align-items: center;
        background: var(--unifold-color-surface, #fff);
        border: 1px solid var(--unifold-color-border, #6b7280);
        border-radius: var(--unifold-radius-sm, 0.375rem);
        color: var(--unifold-color-primary, #1d4ed8);
        display: inline-flex;
        font: inherit;
        justify-content: center;
        min-block-size: var(--unifold-control-min-height, 2.75rem);
        min-inline-size: var(--unifold-control-min-height, 2.75rem);
        padding-inline: var(--unifold-space-2, 0.5rem);
        text-decoration: none;
      }
      [part~="control"]:disabled {
        cursor: not-allowed;
        opacity: 0.55;
      }
      [part~="current"] {
        background: var(--unifold-color-primary, #1d4ed8);
        color: var(--unifold-color-on-primary, #fff);
        font-weight: 700;
      }
      [part="overflow"] {
        display: inline-block;
        min-inline-size: var(--unifold-control-min-height, 2.75rem);
        text-align: center;
      }
      .visually-hidden {
        block-size: 1px;
        clip-path: inset(50%);
        inline-size: 1px;
        overflow: hidden;
        position: absolute;
        white-space: nowrap;
      }
    `
  ];

  declare items: readonly PaginationItem[];
  declare label: string;

  constructor() {
    super();
    this.items = [];
    this.label = "";
  }

  protected override render() {
    return html`<nav part="navigation" aria-label=${this.label}>
      <ul part="list" @click=${this.onClick}>
        ${this.items.map((item, index) => this.renderItem(item, index))}
      </ul>
    </nav>`;
  }

  protected override eventProperties(): JsonObject {
    return { items: this.items, label: this.label };
  }

  private renderItem(item: PaginationItem, index: number) {
    return html`<li part="item">${this.renderItemContent(item, index)}</li>`;
  }

  private renderItemContent(item: PaginationItem, index: number) {
    if (item.kind === PaginationItemKind.Overflow) return renderOverflow(item);
    if (item.disabled === true) return renderDisabledControl(item);
    return renderInteractiveControl(item, index);
  }

  private readonly onClick = (event: Event): void => {
    const index = eventItemIndex(event);
    if (index === undefined) return;
    const item = activatedItem(this.items[index]);
    if (item === undefined) return;
    this.emitUiEvent(ElementEventType.ComponentActivated, activationChange(item));
  };
}

function renderOverflow(item: PaginationItem) {
  return html`<span part="overflow">
    <span aria-hidden="true">${item.label}</span>
    <span class="visually-hidden">${item.accessibleLabel}</span>
  </span>`;
}

function renderDisabledControl(item: PaginationItem) {
  return html`<button
    part=${controlPart(item)}
    type="button"
    disabled
    aria-current=${currentAttribute(item)}
    aria-label=${item.accessibleLabel}
  >
    ${item.label}
  </button>`;
}

function renderInteractiveControl(item: PaginationItem, index: number) {
  const href = safeItemHref(item);
  return href === undefined
    ? html`<button
        part=${controlPart(item)}
        type="button"
        aria-current=${currentAttribute(item)}
        aria-label=${item.accessibleLabel}
        data-pagination-index=${String(index)}
      >
        ${item.label}
      </button>`
    : html`<a
        part=${controlPart(item)}
        href=${href}
        aria-current=${currentAttribute(item)}
        aria-label=${item.accessibleLabel}
        data-pagination-index=${String(index)}
        >${item.label}</a
      >`;
}

function currentAttribute(item: PaginationItem): "page" | typeof nothing {
  return item.current === true ? "page" : nothing;
}

function controlPart(item: PaginationItem): string {
  return item.current === true ? "control current" : "control";
}

function safeItemHref(item: PaginationItem): string | undefined {
  return item.href !== undefined && isSafeUrl(item.href) ? item.href : undefined;
}

function eventItemIndex(event: Event): number | undefined {
  return event.target instanceof Element ? paginationIndex(event.target) : undefined;
}

function paginationIndex(target: Element): number | undefined {
  const value = target.closest<HTMLElement>("[data-pagination-index]")?.dataset["paginationIndex"];
  const index = Number(value);
  return Number.isInteger(index) ? index : undefined;
}

function activatedItem(item: PaginationItem | undefined): PaginationItem | undefined {
  return item !== undefined && isInteractiveItem(item) ? item : undefined;
}

function isInteractiveItem(item: PaginationItem): boolean {
  return item.disabled !== true && item.kind !== PaginationItemKind.Overflow;
}

function activationChange(item: PaginationItem): JsonObject {
  const change = { itemId: item.id, kind: item.kind };
  const href = safeItemHref(item);
  return href === undefined ? change : { ...change, href };
}
