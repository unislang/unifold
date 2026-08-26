import { ButtonAction, ButtonVariant } from "@unislang/unifold-catalog";
import { css, html, type PropertyDeclarations } from "lit";

import { ElementEventType } from "./enums.js";
import { focusRing, hostDefaults } from "./styles.js";
import { UnifoldElement } from "./unifold-element.js";

/**
 * Activates a declared button action through the canonical Unifold event stream.
 *
 * @tagname unifold-button
 * @slot - Optional visible button content appended to the label property.
 * @fires unifold-event - Canonical component activation intent.
 * @cssprop --unifold-color-primary - Primary button background and border color.
 * @cssprop --unifold-radius-md - Button corner radius.
 * @cssprop --unifold-color-on-primary - Primary button text color.
 * @cssprop --unifold-control-min-height - Minimum pointer target height.
 * @cssprop --unifold-space-2 - Block-axis button padding.
 * @cssprop --unifold-space-4 - Inline-axis button padding.
 * @cssprop --unifold-color-surface - Secondary button background color.
 * @cssprop --unifold-color-border - Secondary button border color.
 * @cssprop --unifold-color-text - Secondary button text color.
 */
export class UnifoldButton extends UnifoldElement {
  static override properties: PropertyDeclarations = {
    action: { reflect: true },
    disabled: { reflect: true, type: Boolean },
    label: {},
    variant: { reflect: true }
  };

  static override styles = [
    hostDefaults,
    focusRing,
    css`
      button {
        align-items: center;
        background: var(--unifold-color-primary, #1d4ed8);
        border: 1px solid transparent;
        border-radius: var(--unifold-radius-md, 0.5rem);
        color: var(--unifold-color-on-primary, #ffffff);
        cursor: pointer;
        display: inline-flex;
        font: inherit;
        font-weight: 600;
        justify-content: center;
        min-height: var(--unifold-control-min-height, 2.75rem);
        padding: var(--unifold-space-2, 0.5rem) var(--unifold-space-4, 1rem);
      }

      :host([variant="secondary"]) button,
      :host([variant="quiet"]) button {
        background: var(--unifold-color-surface, #ffffff);
        border-color: var(--unifold-color-border, #6b7280);
        color: var(--unifold-color-text, #111827);
      }

      :host([variant="quiet"]) button {
        border-color: transparent;
      }
      button:disabled {
        cursor: not-allowed;
        opacity: 0.55;
      }
    `
  ];

  declare action: ButtonAction;
  declare disabled: boolean;
  declare label: string;
  declare variant: ButtonVariant;

  constructor() {
    super();
    this.action = ButtonAction.Button;
    this.disabled = false;
    this.label = "";
    this.variant = ButtonVariant.Primary;
  }

  protected override render() {
    return html`
      <button type=${this.action} ?disabled=${this.disabled} @click=${this.activate}>
        ${this.label}<slot></slot>
      </button>
    `;
  }

  protected override eventProperties() {
    return {
      ...super.eventProperties(),
      action: this.action,
      disabled: this.disabled,
      label: this.label,
      variant: this.variant
    };
  }

  private activate(): void {
    this.emitUiEvent(ElementEventType.ComponentActivated, { action: this.action });
  }
}
