import {
  JsonDateConstraintIssue,
  UiUpdateTrigger,
  isJsonDateValue,
  jsonDateConstraintIssue
} from "@unislang/unifold-contracts";
import { DateFieldAutocomplete } from "@unislang/unifold-catalog";
import { html, type PropertyDeclarations } from "lit";

import { ElementEventType, type NativeFormValueOrigin } from "./enums.js";
import {
  NativeFormControlController,
  type NativeFormControlValidity
} from "./native-form-control-controller.js";
import { scalarFormValueAdapter } from "./native-form-value-adapters.js";
import { singleLineInputStyles } from "./single-line-input-styles.js";
import { UnifoldElement } from "./unifold-element.js";

/**
 * Captures one timezone-free Gregorian calendar date as YYYY-MM-DD or an empty string.
 *
 * @tagname unifold-date-field
 * @fires unifold-event - Canonical date input and blur intents.
 * @cssprop --unifold-space-1 - Label and control spacing.
 * @cssprop --unifold-color-surface - Control background color.
 * @cssprop --unifold-color-border - Control border color.
 * @cssprop --unifold-radius-sm - Control corner radius.
 * @cssprop --unifold-color-text - Control text color.
 * @cssprop --unifold-control-min-height - Minimum control height.
 * @cssprop --unifold-color-danger - Invalid control border color.
 */
export class UnifoldDateField extends UnifoldElement {
  static formAssociated = true;

  static override properties: PropertyDeclarations = {
    asyncValidators: { attribute: false },
    autocomplete: {},
    disabled: { reflect: true, type: Boolean },
    errorMessage: { attribute: "error-message" },
    label: {},
    max: { attribute: false },
    min: { attribute: false },
    name: { reflect: true },
    readonly: { reflect: true, type: Boolean },
    required: { reflect: true, type: Boolean },
    step: { attribute: false },
    updateOn: { attribute: "update-on" },
    validators: { attribute: false },
    value: { attribute: false }
  };

  static override styles = singleLineInputStyles;

  declare asyncValidators: readonly string[];
  declare autocomplete: DateFieldAutocomplete;
  declare disabled: boolean;
  declare errorMessage: string;
  declare label: string;
  declare name: string;
  declare readonly: boolean;
  declare required: boolean;
  declare updateOn: UiUpdateTrigger;
  declare validators: readonly string[];
  private dateMaximum = "";
  private dateMinimum = "";
  private dateValue = "";
  private dayStep = 1;
  protected readonly formControl = new NativeFormControlController(this, scalarFormValueAdapter);

  constructor() {
    super();
    this.asyncValidators = [];
    this.autocomplete = DateFieldAutocomplete.Off;
    this.disabled = false;
    this.errorMessage = "";
    this.label = "";
    this.max = "";
    this.min = "";
    this.name = "";
    this.readonly = false;
    this.required = false;
    this.step = 1;
    this.updateOn = UiUpdateTrigger.Input;
    this.validators = [];
    this.value = "";
  }

  get max(): string {
    return this.dateMaximum;
  }

  set max(value: string) {
    const next = canonicalDate(value);
    const previous = this.dateMaximum;
    if (next === previous) return;
    this.dateMaximum = next;
    this.requestUpdate("max", previous);
  }

  get min(): string {
    return this.dateMinimum;
  }

  set min(value: string) {
    const next = canonicalDate(value);
    const previous = this.dateMinimum;
    if (next === previous) return;
    this.dateMinimum = next;
    this.requestUpdate("min", previous);
  }

  get step(): number {
    return this.dayStep;
  }

  set step(value: number) {
    const next = canonicalStep(value);
    const previous = this.dayStep;
    if (next === previous) return;
    this.dayStep = next;
    this.requestUpdate("step", previous);
  }

  get value(): string {
    return this.dateValue;
  }

  set value(value: string) {
    const next = canonicalDate(value);
    const previous = this.dateValue;
    if (next === previous) return;
    this.dateValue = next;
    this.requestUpdate("value", previous);
  }

  formControlValidity(): NativeFormControlValidity | undefined {
    const input = this.input();
    if (input === null) return undefined;
    return connectedDateValidity(this.value, this.min, this.max, this.step, input);
  }

  get form(): HTMLFormElement | null {
    return this.formControl.form;
  }

  formControlAnchor(): HTMLElement | null {
    return this.input();
  }

  formControlValueChanged(value: string, origin: NativeFormValueOrigin): void {
    if (!isJsonDateValue(value)) return;
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
    return html`
      <label>
        <span>${this.label}</span>
        <input
          aria-describedby=${errorId}
          aria-invalid=${String(Boolean(this.errorMessage))}
          autocomplete=${this.autocomplete}
          .value=${this.value}
          max=${this.max}
          min=${this.min}
          name=${this.name}
          step=${nativeDateStep(this.min, this.step)}
          type="date"
          ?disabled=${this.formControl.disabled}
          ?readonly=${this.readonly}
          ?required=${this.required}
          @input=${this.onDateInput}
          @blur=${this.onBlur}
        />
      </label>
      <span id=${errorId} role="alert">${this.errorMessage}</span>
    `;
  }

  protected override eventProperties() {
    return {
      ...super.eventProperties(),
      asyncValidators: this.asyncValidators,
      autocomplete: this.autocomplete,
      disabled: this.disabled,
      errorMessage: this.errorMessage,
      label: this.label,
      max: this.max,
      min: this.min,
      name: this.name,
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

  private readonly onDateInput = (event: InputEvent): void => {
    const input = dateInput(event.currentTarget);
    if (input === undefined) return;
    if (this.rejectsInput()) return this.restoreInput(input);
    this.commitOrRestoreInput(input);
  };

  private commitOrRestoreInput(input: HTMLInputElement): void {
    const value = canonicalDateInputValue(input);
    if (value === undefined) return this.restoreInput(input);
    this.formControl.commitInput(value);
  }

  private rejectsInput(): boolean {
    return [this.formControl.disabled, this.readonly].some(Boolean);
  }

  private restoreInput(input: HTMLInputElement): void {
    input.value = this.value;
  }

  private readonly onBlur = (): void => {
    this.emitUiEvent(ElementEventType.ControlBlurred, { value: this.value });
  };

  private input(): HTMLInputElement | null {
    return this.shadowRoot?.querySelector("input") ?? null;
  }
}

const dateConstraintValidity: Readonly<Record<JsonDateConstraintIssue, NativeFormControlValidity>> =
  Object.freeze({
    [JsonDateConstraintIssue.Maximum]: {
      flags: { rangeOverflow: true },
      message: "Date is after the maximum."
    },
    [JsonDateConstraintIssue.Minimum]: {
      flags: { rangeUnderflow: true },
      message: "Date is before the minimum."
    },
    [JsonDateConstraintIssue.Range]: {
      flags: { customError: true },
      message: "Date range is invalid."
    },
    [JsonDateConstraintIssue.Step]: {
      flags: { stepMismatch: true },
      message: "Date does not align with the required day interval."
    },
    [JsonDateConstraintIssue.StepAnchor]: {
      flags: { customError: true },
      message: "A minimum date is required when the day interval exceeds one."
    }
  });

function canonicalDate(value: unknown): string {
  return isJsonDateValue(value) ? value : "";
}

function canonicalStep(value: unknown): number {
  const candidate = typeof value === "number" ? value : Number.NaN;
  const valid = [Number.isInteger(candidate), candidate > 0].every(Boolean);
  return valid ? candidate : 1;
}

function nativeDateStep(minimum: string, step: number): number {
  return minimum === "" && step > 1 ? 1 : step;
}

function dateInput(target: EventTarget | null): HTMLInputElement | undefined {
  if (!(target instanceof HTMLInputElement)) return undefined;
  if (target.getAttribute("type") !== "date") return undefined;
  return target;
}

function canonicalDateInputValue(input: HTMLInputElement): string | undefined {
  return isJsonDateValue(input.value) ? input.value : undefined;
}

function nativeDateValidity(validity: ValidityState): ValidityStateFlags {
  return {
    badInput: validity.badInput,
    rangeOverflow: validity.rangeOverflow,
    rangeUnderflow: validity.rangeUnderflow,
    stepMismatch: validity.stepMismatch
  };
}

function nativeValidityMessage(input: HTMLInputElement): string {
  return input.validationMessage || "Date does not satisfy the declared constraints.";
}

function connectedDateValidity(
  value: string,
  minimum: string,
  maximum: string,
  step: number,
  input: HTMLInputElement
): NativeFormControlValidity | undefined {
  const issue = jsonDateConstraintIssue(value, minimum, maximum, step);
  if (issue !== undefined) return dateConstraintValidity[issue];
  if (input.validity.valid) return undefined;
  return { flags: nativeDateValidity(input.validity), message: nativeValidityMessage(input) };
}
