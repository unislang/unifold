import { UiUpdateTrigger } from "@unislang/unifold-contracts";
import { html, nothing, type PropertyDeclarations } from "lit";

import { ElementEventType, NativeFormValueOrigin } from "./enums.js";
import { NumberFormControlController } from "./number-form-control-controller.js";
import type { NativeFormControlValidity } from "./native-form-control-controller.js";
import { singleLineInputStyles } from "./single-line-input-styles.js";
import { UnifoldElement } from "./unifold-element.js";

/**
 * Captures one finite JSON number or an explicit null empty state.
 *
 * @tagname unifold-number-field
 * @fires unifold-event - Canonical numeric input and blur intents.
 * @cssprop --unifold-space-1 - Label and control spacing.
 * @cssprop --unifold-color-surface - Control background color.
 * @cssprop --unifold-color-border - Control border color.
 * @cssprop --unifold-radius-sm - Control corner radius.
 * @cssprop --unifold-color-text - Control text color.
 * @cssprop --unifold-control-min-height - Minimum control height.
 * @cssprop --unifold-color-danger - Invalid control border color.
 */
export class UnifoldNumberField extends UnifoldElement {
  static formAssociated = true;
  static override properties: PropertyDeclarations = {
    asyncValidators: { attribute: false },
    disabled: { reflect: true, type: Boolean },
    errorMessage: { attribute: "error-message" },
    label: {},
    max: { attribute: false },
    min: { attribute: false },
    name: { reflect: true },
    placeholder: {},
    readonly: { reflect: true, type: Boolean },
    required: { reflect: true, type: Boolean },
    step: { attribute: false },
    updateOn: { attribute: "update-on" },
    validators: { attribute: false },
    value: { attribute: false }
  };

  static override styles = singleLineInputStyles;

  declare asyncValidators: readonly string[];
  declare disabled: boolean;
  declare errorMessage: string;
  declare label: string;
  declare max: number | null;
  declare min: number | null;
  declare name: string;
  declare placeholder: string;
  declare readonly: boolean;
  declare required: boolean;
  declare step: number;
  declare updateOn: UiUpdateTrigger;
  declare validators: readonly string[];
  private numericValue: number | null = null;
  private readonly formControl = new NumberFormControlController(this);

  constructor() {
    super();
    this.asyncValidators = [];
    this.disabled = false;
    this.errorMessage = "";
    this.label = "";
    this.max = null;
    this.min = null;
    this.name = "";
    this.placeholder = "";
    this.readonly = false;
    this.required = false;
    this.step = 1;
    this.updateOn = UiUpdateTrigger.Input;
    this.validators = [];
    this.value = null;
  }

  get value(): number | null {
    return this.numericValue;
  }

  set value(value: number | null) {
    const next = canonicalNumber(value);
    const previous = this.numericValue;
    if (next === previous) return;
    this.numericValue = next;
    this.requestUpdate("value", previous);
  }

  get form(): HTMLFormElement | null {
    return this.formControl.form;
  }

  formControlAnchor(): HTMLElement | null {
    return this.input();
  }

  formControlValidity(): NativeFormControlValidity | undefined {
    const input = this.input();
    if (input === null) return undefined;
    return intrinsicNumberValidity(input);
  }

  formControlValueChanged(value: number | null, origin: NativeFormValueOrigin): void {
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

  protected override render() {
    const errorId = `${this.id}-error`;
    return html`<label>
        <span>${this.label}</span>
        <input
          aria-describedby=${errorId}
          aria-invalid=${String(Boolean(this.errorMessage))}
          .value=${this.value === null ? "" : String(this.value)}
          max=${optionalNumber(this.max)}
          min=${optionalNumber(this.min)}
          name=${this.name}
          placeholder=${this.placeholder}
          step=${this.step}
          type="number"
          ?disabled=${this.formControl.disabled}
          ?readonly=${this.readonly}
          ?required=${this.required}
          @input=${this.onNumberInput}
          @blur=${this.onNumberBlur}
        />
      </label>
      <span id=${errorId} role="alert">${this.errorMessage}</span>`;
  }

  protected override eventProperties() {
    return {
      ...super.eventProperties(),
      asyncValidators: this.asyncValidators,
      disabled: this.disabled,
      errorMessage: this.errorMessage,
      label: this.label,
      max: this.max,
      min: this.min,
      name: this.name,
      placeholder: this.placeholder,
      readonly: this.readonly,
      required: this.required,
      step: this.step,
      updateOn: this.updateOn,
      validators: this.validators,
      value: this.value
    };
  }

  protected override eventValue() {
    return this.value;
  }

  private readonly onNumberInput = (event: InputEvent): void => {
    this.formControl.handleInput(event);
  };

  private readonly onNumberBlur = (): void => {
    this.emitUiEvent(ElementEventType.ControlBlurred, { value: this.value });
  };

  private input(): HTMLInputElement | null {
    return this.shadowRoot?.querySelector("input") ?? null;
  }
}

function optionalNumber(value: number | null) {
  return value === null ? nothing : value;
}

function canonicalNumber(value: number | null): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function intrinsicNumberValidity(input: HTMLInputElement): NativeFormControlValidity | undefined {
  if (input.validity.valid) return undefined;
  return {
    flags: nativeNumberValidity(input.validity),
    message: nativeValidityMessage(input)
  };
}

function nativeValidityMessage(input: HTMLInputElement): string {
  if (input.validationMessage.length > 0) return input.validationMessage;
  return "Value does not satisfy the numeric constraints.";
}

function nativeNumberValidity(validity: ValidityState): ValidityStateFlags {
  return {
    badInput: validity.badInput,
    rangeOverflow: validity.rangeOverflow,
    rangeUnderflow: validity.rangeUnderflow,
    stepMismatch: validity.stepMismatch
  };
}
