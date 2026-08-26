import { BreadcrumbSeparator, isSafeUrl, type BreadcrumbItem } from "@unislang/unifold-catalog";
import type { JsonObject } from "@unislang/unifold-contracts";
import { css, html, nothing, type PropertyDeclarations } from "lit";

import { ElementEventType } from "./enums.js";
import { focusRing, hostDefaults } from "./styles.js";
import { UnifoldElement } from "./unifold-element.js";

/**
 * Presents an ordered native navigation hierarchy with one current location.
 *
 * @tagname unifold-breadcrumb
 * @fires unifold-event - Canonical safe-link activation intent carrying the declared item ID.
 * @csspart navigation - Labelled native navigation landmark.
 * @csspart list - Ordered hierarchy list.
 * @csspart item - One hierarchy position.
 * @csspart link - One native ancestor or current-page link.
 * @csspart current - Non-link current-page label.
 * @csspart separator - Presentation-only hierarchy separator.
 * @cssprop --unifold-color-primary - Link color.
 * @cssprop --unifold-color-muted - Separator color.
 * @cssprop --unifold-space-1 - Compact spacing.
 * @cssprop --unifold-space-2 - Default spacing.
 */
export class UnifoldBreadcrumb extends UnifoldElement {
  static override properties: PropertyDeclarations = {
    compact: { reflect: true, type: Boolean },
    items: { attribute: false },
    label: {},
    separator: { reflect: true }
  };

  static override styles = [
    hostDefaults,
    focusRing,
    css`
      :host {
        display: block;
      }
      [part="list"] {
        align-items: center;
        display: flex;
        flex-wrap: wrap;
        gap: var(--unifold-space-2, 0.5rem);
        list-style: none;
        margin: 0;
        padding: 0;
      }
      :host([compact]) [part="list"] {
        gap: var(--unifold-space-1, 0.25rem);
      }
      [part="item"] {
        align-items: center;
        display: inline-flex;
        gap: inherit;
      }
      [part="link"] {
        color: var(--unifold-color-primary, #1d4ed8);
        text-underline-offset: 0.15em;
      }
      [part="current"] {
        font-weight: 600;
      }
      [part="separator"] {
        color: var(--unifold-color-muted, #6b7280);
      }
    `
  ];

  declare compact: boolean;
  declare items: readonly BreadcrumbItem[];
  declare label: string;
  declare separator: BreadcrumbSeparator;

  constructor() {
    super();
    this.compact = false;
    this.items = [];
    this.label = "";
    this.separator = BreadcrumbSeparator.Chevron;
  }

  protected override render() {
    return html`
      <nav part="navigation" aria-label=${this.label}>
        <ol part="list" @click=${this.onClick}>
          ${this.items.map((item, index) => this.renderItem(item, index))}
        </ol>
      </nav>
    `;
  }

  protected override eventProperties(): JsonObject {
    return {
      compact: this.compact,
      items: this.items,
      label: this.label,
      separator: this.separator
    };
  }

  private renderItem(item: BreadcrumbItem, index: number) {
    const current = index === this.items.length - 1;
    return html`<li part="item">
      ${this.renderItemContent(item, index, current)} ${current ? nothing : this.renderSeparator()}
    </li>`;
  }

  private renderItemContent(item: BreadcrumbItem, index: number, current: boolean) {
    const ariaCurrent = current ? "page" : nothing;
    if (item.href === undefined)
      return html`<span part="current" aria-current=${ariaCurrent}>${item.label}</span>`;
    return html`<a
      part="link"
      href=${safeHref(item.href)}
      aria-current=${ariaCurrent}
      data-breadcrumb-index=${String(index)}
      >${item.label}</a
    >`;
  }

  private renderSeparator() {
    return html`<span part="separator" aria-hidden="true">${separatorText(this.separator)}</span>`;
  }

  private readonly onClick = (event: Event): void => {
    const index = eventItemIndex(event);
    if (index === undefined) return;
    const item = linkedItem(this.items, index);
    if (item === undefined) return;
    this.emitUiEvent(ElementEventType.ComponentActivated, {
      href: safeHref(item.href),
      itemId: item.id
    });
  };
}

function eventItemIndex(event: Event): number | undefined {
  const target = eventTargetElement(event);
  if (target === undefined) return undefined;
  return finiteIndex(breadcrumbIndexValue(target));
}

function breadcrumbIndexValue(target: Element): string | undefined {
  return target.closest<HTMLElement>("[data-breadcrumb-index]")?.dataset["breadcrumbIndex"];
}

function finiteIndex(value: string | undefined): number | undefined {
  const index = Number(value);
  return Number.isInteger(index) ? index : undefined;
}

function eventTargetElement(event: Event): Element | undefined {
  return event.target instanceof Element ? event.target : undefined;
}

function linkedItem(
  items: readonly BreadcrumbItem[],
  index: number
): (BreadcrumbItem & { readonly href: string }) | undefined {
  const item = items[index];
  if (item?.href === undefined) return undefined;
  return item as BreadcrumbItem & { readonly href: string };
}

function safeHref(value: string): string {
  return isSafeUrl(value) ? value : "#";
}

function separatorText(separator: BreadcrumbSeparator): string {
  return separator === BreadcrumbSeparator.Slash ? "/" : "›";
}
