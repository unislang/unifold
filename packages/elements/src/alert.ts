import { AlertTone } from "@unislang/unifold-catalog";
import { css, html, nothing, type PropertyDeclarations } from "lit";

import { hostDefaults } from "./styles.js";
import { UnifoldElement } from "./unifold-element.js";

const urgentTones = new Set([AlertTone.Danger, AlertTone.Warning]);

/**
 * Announces contextual status through polite or assertive native live-region semantics.
 *
 * @tagname unifold-alert
 * @csspart container - Live-region content container.
 * @cssprop --unifold-color-surface-subtle - Alert background color.
 * @cssprop --unifold-color-primary - Informational border color.
 * @cssprop --unifold-color-success - Success border color.
 * @cssprop --unifold-color-warning - Warning border color.
 * @cssprop --unifold-color-danger - Danger border color.
 * @cssprop --unifold-radius-sm - Alert corner radius.
 * @cssprop --unifold-space-1 - Title and content spacing.
 * @cssprop --unifold-space-3 - Alert padding.
 */
export class UnifoldAlert extends UnifoldElement {
  static override properties: PropertyDeclarations = {
    content: {},
    title: {},
    tone: { reflect: true }
  };

  static override styles = [
    hostDefaults,
    css`
      [part="container"] {
        background: var(--unifold-color-surface-subtle, #f3f4f6);
        border-inline-start: 0.25rem solid var(--unifold-color-primary, #1d4ed8);
        border-radius: var(--unifold-radius-sm, 0.375rem);
        display: grid;
        gap: var(--unifold-space-1, 0.25rem);
        padding: var(--unifold-space-3, 0.75rem);
      }
      :host([tone="success"]) [part="container"] {
        border-color: var(--unifold-color-success, #047857);
      }
      :host([tone="warning"]) [part="container"] {
        border-color: var(--unifold-color-warning, #a16207);
      }
      :host([tone="danger"]) [part="container"] {
        border-color: var(--unifold-color-danger, #b91c1c);
      }
    `
  ];

  declare content: string;
  declare title: string;
  declare tone: AlertTone;

  constructor() {
    super();
    this.content = "";
    this.title = "";
    this.tone = AlertTone.Info;
  }

  protected override render() {
    return html`
      <div part="container" role=${this.liveRole()} aria-live=${this.liveMode()}>
        ${this.title === "" ? nothing : html`<strong>${this.title}</strong>`}
        <span>${this.content}</span>
      </div>
    `;
  }

  protected override eventProperties() {
    return {
      ...super.eventProperties(),
      content: this.content,
      title: this.title,
      tone: this.tone
    };
  }

  private liveRole(): "alert" | "status" {
    return urgentTones.has(this.tone) ? "alert" : "status";
  }

  private liveMode(): "assertive" | "polite" {
    return urgentTones.has(this.tone) ? "assertive" : "polite";
  }
}
