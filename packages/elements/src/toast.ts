import { ToastDismissReason, ToastStatus, ToastVariant } from "@unislang/unifold-catalog";
import { css, html, nothing, type PropertyDeclarations, type PropertyValues } from "lit";

import { ElementEventType } from "./enums.js";
import { focusRing, hostDefaults } from "./styles.js";
import { UnifoldElement } from "./unifold-element.js";

const urgentStatuses = new Set([ToastStatus.Warning, ToastStatus.Error]);

/**
 * Announces one persistent notification and requests explicit dismissal through the event stream.
 *
 * @tagname unifold-toast
 * @fires unifold-event - Canonical manual dismissal intent.
 * @csspart container - Toast surface and dismissal layout.
 * @csspart announcement - Atomic live-region content.
 * @csspart label - Visible notification label.
 * @csspart message - Visible notification message.
 * @csspart dismiss - Optional native dismissal button outside the live region.
 * @cssprop --unifold-color-surface - Subtle toast background.
 * @cssprop --unifold-color-text - Toast foreground.
 * @cssprop --unifold-color-primary - Informational accent color.
 * @cssprop --unifold-color-success - Success accent color.
 * @cssprop --unifold-color-warning - Warning accent color.
 * @cssprop --unifold-color-danger - Error accent color.
 * @cssprop --unifold-radius-md - Toast corner radius.
 * @cssprop --unifold-space-2 - Toast content spacing.
 * @cssprop --unifold-space-3 - Toast padding.
 */
export class UnifoldToast extends UnifoldElement {
  static override properties: PropertyDeclarations = {
    dismissible: { reflect: true, type: Boolean },
    dismissLabel: { attribute: "dismiss-label" },
    label: {},
    message: {},
    status: { reflect: true },
    variant: { reflect: true },
    visible: { reflect: true, type: Boolean }
  };

  static override styles = [
    hostDefaults,
    focusRing,
    css`
      [part="container"] {
        align-items: start;
        background: var(--unifold-color-surface, #fff);
        border: 1px solid var(--unifold-color-border, #d1d5db);
        border-inline-start: 0.25rem solid var(--unifold-color-primary, #1d4ed8);
        border-radius: var(--unifold-radius-md, 0.5rem);
        display: flex;
        gap: var(--unifold-space-3, 0.75rem);
        justify-content: space-between;
        padding: var(--unifold-space-3, 0.75rem);
      }
      [part="announcement"] {
        display: grid;
        gap: var(--unifold-space-2, 0.5rem);
      }
      [part="label"] {
        font-weight: 600;
      }
      [part="dismiss"] {
        background: transparent;
        border: 1px solid currentColor;
        border-radius: var(--unifold-radius-sm, 0.375rem);
        color: inherit;
        cursor: pointer;
        font: inherit;
        min-block-size: var(--unifold-control-min-height, 2.75rem);
        padding-inline: var(--unifold-space-2, 0.5rem);
      }
      :host([status="success"]) [part="container"] {
        border-inline-start-color: var(--unifold-color-success, #047857);
      }
      :host([status="warning"]) [part="container"] {
        border-inline-start-color: var(--unifold-color-warning, #a16207);
      }
      :host([status="error"]) [part="container"] {
        border-inline-start-color: var(--unifold-color-danger, #b91c1c);
      }
      :host([variant="solid"]) [part="container"] {
        background: var(--unifold-color-text, #111827);
        color: var(--unifold-color-surface, #fff);
      }
    `
  ];

  declare dismissible: boolean;
  declare dismissLabel: string;
  declare label: string;
  declare message: string;
  declare status: ToastStatus;
  declare variant: ToastVariant;
  declare visible: boolean;

  constructor() {
    super();
    this.dismissible = true;
    this.dismissLabel = "Dismiss notification";
    this.label = "";
    this.message = "";
    this.status = ToastStatus.Info;
    this.variant = ToastVariant.Subtle;
    this.visible = true;
  }

  protected override render() {
    if (!this.visible) return nothing;
    return html`
      <section part="container">
        <div part="announcement" role=${this.liveRole()} aria-atomic="true">
          <strong part="label">${this.label}</strong>
          <span part="message">${this.message}</span>
        </div>
        ${this.dismissible
          ? html`<button part="dismiss" type="button" @click=${this.dismiss}>
              ${this.dismissLabel}
            </button>`
          : nothing}
      </section>
    `;
  }

  protected override eventProperties() {
    return {
      ...super.eventProperties(),
      dismissible: this.dismissible,
      dismissLabel: this.dismissLabel,
      label: this.label,
      message: this.message,
      status: this.status,
      variant: this.variant,
      visible: this.visible
    };
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed);
    this.hidden = !this.visible;
  }

  private liveRole(): "alert" | "status" {
    return urgentStatuses.has(this.status) ? "alert" : "status";
  }

  private readonly dismiss = (): void => {
    this.emitUiEvent(ElementEventType.ComponentActivated, {
      dismissed: true,
      reason: ToastDismissReason.Manual
    });
  };
}
