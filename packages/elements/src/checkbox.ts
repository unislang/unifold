import { css, html, type PropertyDeclarations } from "lit";
import { UiUpdateTrigger } from "@unislang/unifold-contracts";

import { ElementEventType } from "./enums.js";
import { focusRing, hostDefaults, validationStyles } from "./styles.js";
import { UnifoldElement } from "./unifold-element.js";

/**
 * Captures one native boolean choice with accessible validation projection.
 *
 * @tagname unifold-checkbox
 * @fires unifold-event - Canonical checkbox input and blur intents.
 * @cssprop --unifold-space-2 - Gap between the checkbox and label.
 * @cssprop --unifold-control-min-height - Minimum pointer target height.
 * @cssprop --unifold-color-primary - Native checkbox accent color.
 */
export class UnifoldCheckbox extends UnifoldElement {
  static override properties: PropertyDeclarations = {
    asyncValidators: { attribute: false },
    disabled: { reflect: true, type: Boolean },
    errorMessage: { attribute: "error-message" },
    label: {},
    name: {},
    required: { reflect: true, type: Boolean },
    updateOn: { attribute: "update-on" },
    validators: { attribute: false },
    value: { type: Boolean }
  };

  static override styles = [
    hostDefaults,
    focusRing,
    validationStyles,
    css`
      label {
        align-items: center;
        cursor: pointer;
        display: inline-flex;
        gap: var(--unifold-space-2, 0.5rem);
        min-height: var(--unifold-control-min-height, 2.75rem);
      }
      input {
        accent-color: var(--unifold-color-primary, #1d4ed8);
        block-size: 1.25rem;
        inline-size: 1.25rem;
      }
      :host([disabled]) label {
        cursor: not-allowed;
        opacity: 0.55;
      }
    `
  ];

  declare asyncValidators: readonly string[];
  declare disabled: boolean;
  declare errorMessage: string;
  declare label: string;
  declare name: string;
  declare required: boolean;
  declare updateOn: UiUpdateTrigger;
  declare validators: readonly string[];
  declare value: boolean;

  constructor() {
    super();
    this.asyncValidators = [];
    this.disabled = false;
    this.errorMessage = "";
    this.label = "";
    this.name = "";
    this.required = false;
    this.updateOn = UiUpdateTrigger.Input;
    this.validators = [];
    this.value = false;
  }

  protected override render() {
    const errorId = `${this.id}-error`;
    return html`
      <label>
        <input
          aria-describedby=${errorId}
          aria-invalid=${String(Boolean(this.errorMessage))}
          .checked=${this.value}
          name=${this.name}
          type="checkbox"
          ?disabled=${this.disabled}
          ?required=${this.required}
          @change=${this.onChange}
          @blur=${this.onBlur}
        />
        <span>${this.label}</span>
      </label>
      <span id=${errorId} role="alert">${this.errorMessage}</span>
    `;
  }

  protected override eventProperties() {
    return {
      ...super.eventProperties(),
      asyncValidators: this.asyncValidators,
      disabled: this.disabled,
      errorMessage: this.errorMessage,
      label: this.label,
      name: this.name,
      required: this.required,
      updateOn: this.updateOn,
      validators: this.validators,
      value: this.value
    };
  }

  protected override eventValue() {
    return this.value;
  }

  private readonly onChange = (event: Event): void => {
    this.value = (event.currentTarget as HTMLInputElement).checked;
    this.emitUiEvent(ElementEventType.ControlInput, { value: this.value });
  };

  private readonly onBlur = (): void => {
    this.emitUiEvent(ElementEventType.ControlBlurred, { value: this.value });
  };
}
