import { UiUpdateTrigger } from "@unislang/unifold-contracts";
import { css, html, type PropertyDeclarations } from "lit";

import { ElementEventType, NativeFormValueOrigin } from "./enums.js";
import { NativeFormControlController } from "./native-form-control-controller.js";
import { booleanFormValueAdapter } from "./native-form-value-adapters.js";
import { focusRing, hostDefaults, validationStyles } from "./styles.js";
import { UnifoldElement } from "./unifold-element.js";

/**
 * Toggles one immediate boolean setting with ARIA switch semantics.
 *
 * @tagname unifold-switch
 * @fires unifold-event - Canonical switch input and blur intents.
 * @cssprop --unifold-space-2 - Gap between the switch and label.
 * @cssprop --unifold-control-min-height - Minimum pointer target height.
 * @cssprop --unifold-color-primary - Native switch accent color.
 */
export class UnifoldSwitch extends UnifoldElement {
  static formAssociated = true;

  static override properties: PropertyDeclarations = {
    asyncValidators: { attribute: false },
    disabled: { reflect: true, type: Boolean },
    errorMessage: { attribute: "error-message" },
    label: {},
    name: { reflect: true },
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
        appearance: none;
        accent-color: var(--unifold-color-primary, #1d4ed8);
        background: var(--unifold-color-surface, #ffffff);
        border: 2px solid var(--unifold-color-border, #6b7280);
        border-radius: 9999px;
        block-size: 1.5rem;
        inline-size: 2.75rem;
        padding: 0.125rem;
      }
      input::before {
        background: currentColor;
        border-radius: 50%;
        content: "";
        display: block;
        block-size: 1rem;
        inline-size: 1rem;
        transition: transform 120ms ease;
      }
      input:checked {
        background: var(--unifold-color-primary, #1d4ed8);
        border-color: var(--unifold-color-primary, #1d4ed8);
        color: var(--unifold-color-surface, #ffffff);
      }
      input:checked::before {
        transform: translateX(1.25rem);
      }
      :host([disabled]) label {
        cursor: not-allowed;
        opacity: 0.55;
      }
      @media (forced-colors: active) {
        input {
          appearance: auto;
        }
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
  protected readonly formControl = new NativeFormControlController(this, booleanFormValueAdapter);

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
          role="switch"
          type="checkbox"
          ?disabled=${this.formControl.disabled}
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

  get form(): HTMLFormElement | null {
    return this.formControl.form;
  }

  formControlAnchor(): HTMLElement | null {
    return this.shadowRoot?.querySelector("input") ?? null;
  }

  formControlValueChanged(value: boolean, origin: NativeFormValueOrigin): void {
    this.value = value;
    this.emitUiEvent(ElementEventType.ControlInput, { origin, value });
  }

  formDisabledCallback(disabled: boolean): void {
    this.formControl.formDisabledCallback(disabled);
  }

  formResetCallback(): void {
    this.formControl.formResetCallback();
  }

  formStateRestoreCallback(state: File | FormData | string, mode: string): void {
    this.formControl.formStateRestoreCallback(state, mode);
  }

  private readonly onChange = (event: Event): void => {
    const input = event.currentTarget as HTMLInputElement;
    if (this.formControl.disabled) return this.restoreInput(input);
    this.formControl.commitInput(input.checked);
  };

  private restoreInput(input: HTMLInputElement): void {
    input.checked = this.value;
  }

  private readonly onBlur = (): void => {
    this.emitUiEvent(ElementEventType.ControlBlurred, { value: this.value });
  };
}
