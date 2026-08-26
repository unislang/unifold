import { css, html, type PropertyDeclarations } from "lit";
import { UiUpdateTrigger } from "@unislang/unifold-contracts";

import { ElementEventType } from "./enums.js";
import { focusRing, hostDefaults } from "./styles.js";
import { UnifoldElement } from "./unifold-element.js";

/**
 * Reveals or hides one content region through a native details disclosure.
 *
 * @tagname unifold-accordion
 * @slot - Disclosure panel content.
 * @fires unifold-event - Canonical disclosure input intent.
 * @cssprop --unifold-color-border - Disclosure border color.
 * @cssprop --unifold-radius-md - Disclosure corner radius.
 * @cssprop --unifold-control-min-height - Summary pointer target height.
 * @cssprop --unifold-space-3 - Summary and panel padding.
 */
export class UnifoldAccordion extends UnifoldElement {
  static override properties: PropertyDeclarations = {
    asyncValidators: { attribute: false },
    disabled: { reflect: true, type: Boolean },
    label: {},
    name: {},
    updateOn: { attribute: "update-on" },
    validators: { attribute: false },
    value: { type: Boolean }
  };

  declare asyncValidators: readonly string[];
  static override styles = [
    hostDefaults,
    focusRing,
    css`
      details {
        border: 1px solid var(--unifold-color-border, #6b7280);
        border-radius: var(--unifold-radius-md, 0.5rem);
      }
      summary {
        cursor: pointer;
        font-weight: 600;
        min-height: var(--unifold-control-min-height, 2.75rem);
        padding: var(--unifold-space-3, 0.75rem);
      }
      section {
        border-block-start: 1px solid var(--unifold-color-border, #6b7280);
        padding: var(--unifold-space-3, 0.75rem);
      }
      :host([disabled]) summary {
        cursor: not-allowed;
        opacity: 0.55;
      }
    `
  ];

  declare disabled: boolean;
  declare label: string;
  declare name: string;
  declare updateOn: UiUpdateTrigger;
  declare validators: readonly string[];
  declare value: boolean;

  constructor() {
    super();
    this.asyncValidators = [];
    this.disabled = false;
    this.label = "";
    this.name = "";
    this.updateOn = UiUpdateTrigger.Input;
    this.validators = [];
    this.value = false;
  }

  protected override render() {
    return html`
      <details ?open=${this.value}>
        <summary aria-disabled=${String(this.disabled)} @click=${this.onToggle}>
          ${this.label}
        </summary>
        <section><slot></slot></section>
      </details>
    `;
  }

  protected override eventProperties() {
    return {
      ...super.eventProperties(),
      asyncValidators: this.asyncValidators,
      disabled: this.disabled,
      label: this.label,
      name: this.name,
      updateOn: this.updateOn,
      validators: this.validators,
      value: this.value
    };
  }

  protected override eventValue() {
    return this.value;
  }

  private readonly onToggle = (event: MouseEvent): void => {
    event.preventDefault();
    if (this.disabled) return;
    this.emitUiEvent(ElementEventType.ControlInput, { value: !this.value });
  };
}
