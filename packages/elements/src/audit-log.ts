import type { AuditLogEntry } from "@unislang/unifold-catalog";
import { css, html, nothing, type PropertyDeclarations } from "lit";
import { styleMap } from "lit/directives/style-map.js";

import { auditLogWindow } from "./audit-log-window.js";
import { hostDefaults } from "./styles.js";
import { UnifoldElement } from "./unifold-element.js";

/**
 * Presents an authored-order, read-only, virtualized audit timeline.
 *
 * @tagname unifold-audit-log
 * @csspart title - Audit timeline heading.
 * @csspart viewport - Keyboard-scrollable timeline viewport.
 * @csspart entry - An audit entry in the current virtual window.
 * @csspart correlation - Optional correlation identifier.
 * @csspart empty - Empty-history message.
 */
export class UnifoldAuditLog extends UnifoldElement {
  static override properties: PropertyDeclarations = {
    emptyMessage: { attribute: "empty-message" },
    entries: { attribute: false },
    itemHeight: { attribute: "item-height", type: Number },
    label: {},
    overscan: { type: Number },
    viewportHeight: { attribute: "viewport-height", type: Number },
    viewportScrollTop: { state: true }
  };

  static override styles = [
    hostDefaults,
    css`
      :host {
        display: block;
      }
      [part="title"] {
        font-size: 1rem;
        margin-block: 0 var(--unifold-space-2, 0.5rem);
      }
      [part="viewport"] {
        border: 1px solid var(--unifold-color-border, #d1d5db);
        overflow: auto;
        position: relative;
      }
      [part="spacer"] {
        pointer-events: none;
        width: 1px;
      }
      [part="list"] {
        left: 0;
        list-style: none;
        margin: 0;
        padding: 0;
        position: absolute;
        right: 0;
        top: 0;
      }
      [part="entry"] {
        border-block-end: 1px solid var(--unifold-color-border, #d1d5db);
        box-sizing: border-box;
        display: grid;
        gap: var(--unifold-space-1, 0.25rem);
        overflow: hidden;
        padding: var(--unifold-space-2, 0.5rem) var(--unifold-space-3, 0.75rem);
      }
      [part="metadata"] {
        display: flex;
        flex-wrap: wrap;
        gap: var(--unifold-space-2, 0.5rem);
      }
      [part="action"] {
        font-weight: 600;
      }
      [part="summary"] {
        margin: 0;
      }
      [part="correlation"] {
        color: var(--unifold-color-text-muted, #4b5563);
      }
      [part="empty"] {
        margin: 0;
        padding: var(--unifold-space-3, 0.75rem);
      }
    `
  ];

  declare emptyMessage: string;
  declare entries: readonly AuditLogEntry[];
  declare itemHeight: number;
  declare label: string;
  declare overscan: number;
  declare viewportHeight: number;
  declare viewportScrollTop: number;

  constructor() {
    super();
    this.emptyMessage = "No audit events";
    this.entries = [];
    this.itemHeight = 88;
    this.label = "";
    this.overscan = 4;
    this.viewportHeight = 480;
    this.viewportScrollTop = 0;
  }

  protected override render() {
    const titleId = `${this.id}__title`;
    return html`<section aria-labelledby=${titleId}>
      <h2 id=${titleId} part="title">${this.label}</h2>
      ${this.renderViewport(titleId)}
    </section>`;
  }

  protected override eventProperties() {
    return {
      ...super.eventProperties(),
      emptyMessage: this.emptyMessage,
      entries: this.entries,
      itemHeight: this.itemHeight,
      label: this.label,
      overscan: this.overscan,
      viewportHeight: this.viewportHeight
    };
  }

  private renderViewport(titleId: string) {
    const range = auditLogWindow({
      entryCount: this.entries.length,
      itemHeight: this.itemHeight,
      overscan: this.overscan,
      scrollTop: this.viewportScrollTop,
      viewportHeight: this.viewportHeight
    });
    return html`<div
      part="viewport"
      tabindex="0"
      aria-labelledby=${titleId}
      style=${styleMap({ height: `${this.viewportHeight}px` })}
      @scroll=${this.onScroll}
    >
      ${this.entries.length === 0 ? this.renderEmpty() : this.renderWindow(range.start, range.end)}
    </div>`;
  }

  private renderWindow(start: number, end: number) {
    const spacer = { height: `${this.entries.length * this.itemHeight}px` };
    const list = { transform: `translateY(${start * this.itemHeight}px)` };
    return html`<div part="spacer" aria-hidden="true" style=${styleMap(spacer)}></div>
      <ol part="list" start=${String(start + 1)} style=${styleMap(list)}>
        ${this.entries
          .slice(start, end)
          .map((entry, offset) => this.renderEntry(entry, start + offset))}
      </ol>`;
  }

  private renderEntry(entry: AuditLogEntry, index: number) {
    return html`<li
      part="entry"
      data-entry-id=${entry.id}
      aria-posinset=${String(index + 1)}
      aria-setsize=${String(this.entries.length)}
      style=${styleMap({ height: `${this.itemHeight}px` })}
    >
      <div part="metadata">
        <time datetime=${entry.timestamp}>${entry.timestamp}</time>
        <span part="actor">${entry.actor}</span>
        <span part="action">${entry.action}</span>
      </div>
      <p part="summary">${entry.summary}</p>
      ${entry.correlationId === undefined
        ? nothing
        : html`<code part="correlation">Correlation: ${entry.correlationId}</code>`}
    </li>`;
  }

  private renderEmpty() {
    return html`<p part="empty">${this.emptyMessage}</p>`;
  }

  private readonly onScroll = (event: Event): void => {
    this.viewportScrollTop = (event.currentTarget as HTMLElement).scrollTop;
  };
}
