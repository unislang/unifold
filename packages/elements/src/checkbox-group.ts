import type { ChoiceOption } from "@unislang/unifold-catalog";
import { UiUpdateTrigger } from "@unislang/unifold-contracts";
import { css, html, type PropertyDeclarations } from "lit";
import { live } from "lit/directives/live.js";

import { ElementEventType, NativeFormValueOrigin } from "./enums.js";
import { NativeFormControlController } from "./native-form-control-controller.js";
import { createStringArrayFormValueAdapter } from "./native-form-value-adapters.js";
import { focusRing, hostDefaults, validationStyles } from "./styles.js";
import { UnifoldElement } from "./unifold-element.js";

/**
 * Selects zero or more declared values through native checkboxes.
 *
 * @tagname unifold-checkbox-group
 * @fires unifold-event - Canonical complete selection and blur intents.
 * @cssprop --unifold-space-1 - Spacing between group rows.
 * @cssprop --unifold-space-2 - Spacing within checkbox labels.
 * @cssprop --unifold-color-primary - Native checkbox accent color.
 */
export class UnifoldCheckboxGroup extends UnifoldElement {
  static formAssociated = true;
  private focusGeneration = 0;

  static override properties: PropertyDeclarations = {
    asyncValidators: { attribute: false },
    disabled: { reflect: true, type: Boolean },
    errorMessage: { attribute: "error-message" },
    label: {},
    name: { reflect: true },
    options: { attribute: false },
    required: { reflect: true, type: Boolean },
    updateOn: { attribute: "update-on" },
    validators: { attribute: false },
    value: { attribute: false }
  };

  static override styles = [
    hostDefaults,
    focusRing,
    validationStyles,
    css`
      fieldset {
        border: 0;
        display: grid;
        gap: var(--unifold-space-1, 0.25rem);
        margin: 0;
        padding: 0;
      }
      legend {
        font-weight: 600;
        margin-block-end: var(--unifold-space-1, 0.25rem);
      }
      label {
        align-items: center;
        display: flex;
        gap: var(--unifold-space-2, 0.5rem);
        min-height: var(--unifold-control-min-height, 2.75rem);
      }
      input {
        accent-color: var(--unifold-color-primary, #1d4ed8);
        block-size: 1.25rem;
        inline-size: 1.25rem;
      }
      :host([disabled]) label {
        opacity: 0.55;
      }
    `
  ];

  declare asyncValidators: readonly string[];
  declare disabled: boolean;
  declare errorMessage: string;
  declare label: string;
  declare name: string;
  declare options: readonly ChoiceOption[];
  declare required: boolean;
  declare updateOn: UiUpdateTrigger;
  declare validators: readonly string[];
  declare value: readonly string[];
  protected readonly formControl = new NativeFormControlController(
    this,
    createStringArrayFormValueAdapter(() => this.options)
  );

  constructor() {
    super();
    this.asyncValidators = [];
    this.disabled = false;
    this.errorMessage = "";
    this.label = "";
    this.name = "";
    this.options = [];
    this.required = false;
    this.updateOn = UiUpdateTrigger.Input;
    this.validators = [];
    this.value = [];
  }

  protected override render() {
    const errorId = `${this.id}-error`;
    return html`
      <fieldset
        aria-describedby=${errorId}
        aria-invalid=${String(Boolean(this.errorMessage))}
        ?disabled=${this.formControl.disabled}
        @focusin=${this.onFocusIn}
        @focusout=${this.onFocusOut}
      >
        <legend>${this.label}</legend>
        ${this.options.map((option) => this.renderOption(option))}
      </fieldset>
      <span id=${errorId} role="alert">${this.errorMessage}</span>
    `;
  }

  private renderOption(option: ChoiceOption) {
    return html`
      <label>
        <input
          .checked=${live(option.disabled !== true && this.value.includes(option.value))}
          name=${this.name}
          type="checkbox"
          value=${option.value}
          ?disabled=${this.formControl.disabled || option.disabled === true}
          @change=${this.onChange}
        />
        <span>${option.label}</span>
      </label>
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
      options: this.options,
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
    const root = this.shadowRoot;
    if (root === null) return null;
    return groupAnchor(root);
  }

  formControlValueChanged(value: readonly string[], origin: NativeFormValueOrigin): void {
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
    if (this.formControl.disabled || input.disabled) return this.restoreInput(input);
    this.formControl.commitInput(this.checkedValues());
  };

  private restoreInput(input: HTMLInputElement): void {
    const option = this.options.find(({ value }) => value === input.value);
    input.checked =
      option !== undefined && option.disabled !== true && this.value.includes(input.value);
  }

  private checkedValues(): readonly string[] {
    const inputs = this.shadowRoot?.querySelectorAll<HTMLInputElement>('input[type="checkbox"]');
    if (inputs === undefined) return [];
    return [...inputs].filter(({ checked }) => checked).map(({ value }) => value);
  }

  private readonly onFocusIn = (): void => {
    this.focusGeneration += 1;
  };

  private readonly onFocusOut = (): void => {
    const generation = ++this.focusGeneration;
    queueMicrotask(() => this.emitGroupBlur(generation));
  };

  private emitGroupBlur(generation: number): void {
    if (generation !== this.focusGeneration) return;
    if (activeWithinGroup(this.shadowRoot)) return;
    this.emitUiEvent(ElementEventType.ControlBlurred, { value: this.value });
  }
}

function groupAnchor(root: ShadowRoot): HTMLElement | null {
  const enabled = root.querySelector<HTMLElement>("input:not(:disabled)");
  return enabled ?? root.querySelector<HTMLElement>("fieldset");
}

function activeWithinGroup(root: ShadowRoot | null): boolean {
  if (root === null) return false;
  return fieldsetContains(root, root.activeElement);
}

function fieldsetContains(root: ShadowRoot, active: Element | null): boolean {
  if (!(active instanceof Node)) return false;
  const fieldset = root.querySelector("fieldset");
  if (fieldset === null) return false;
  return fieldset.contains(active);
}
