import type { ChoiceOption } from "@unislang/unifold-catalog";
import { UiUpdateTrigger } from "@unislang/unifold-contracts";
import { css, html, type PropertyDeclarations } from "lit";
import { live } from "lit/directives/live.js";

import { ElementEventType } from "./enums.js";
import { focusRing, hostDefaults, validationStyles } from "./styles.js";
import { UnifoldElement } from "./unifold-element.js";

/**
 * Selects zero or more registered values through a native multiple select.
 *
 * @tagname unifold-multi-select
 * @fires unifold-event - Canonical multiple-selection and blur intents.
 * @cssprop --unifold-space-1 - Label and control spacing.
 * @cssprop --unifold-color-surface - Control background color.
 * @cssprop --unifold-color-border - Control border color.
 * @cssprop --unifold-radius-sm - Control corner radius.
 * @cssprop --unifold-color-text - Control text color.
 * @cssprop --unifold-space-2 - Control padding.
 */
export class UnifoldMultiSelect extends UnifoldElement {
  static override properties: PropertyDeclarations = {
    asyncValidators: { attribute: false },
    disabled: { reflect: true, type: Boolean },
    errorMessage: { attribute: "error-message" },
    label: {},
    name: {},
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
      label {
        display: grid;
        font-weight: 600;
        gap: var(--unifold-space-1, 0.25rem);
      }
      select {
        background: var(--unifold-color-surface, #ffffff);
        border: 1px solid var(--unifold-color-border, #6b7280);
        border-radius: var(--unifold-radius-sm, 0.375rem);
        color: var(--unifold-color-text, #111827);
        font: inherit;
        min-height: 7rem;
        padding: var(--unifold-space-2, 0.5rem);
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
      <label>
        <span>${this.label}</span>
        <select
          aria-describedby=${errorId}
          aria-invalid=${String(Boolean(this.errorMessage))}
          multiple
          name=${this.name}
          ?disabled=${this.disabled}
          ?required=${this.required}
          @change=${this.onChange}
          @blur=${this.onBlur}
        >
          ${this.options.map((option) => renderOption(option, this.value))}
        </select>
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

  private readonly onChange = (event: Event): void => {
    const select = event.currentTarget as HTMLSelectElement;
    this.value = [...select.selectedOptions].map(({ value }) => value);
    this.emitUiEvent(ElementEventType.ControlInput, { value: this.value });
  };

  private readonly onBlur = (): void => {
    this.emitUiEvent(ElementEventType.ControlBlurred, { value: this.value });
  };
}

function renderOption(option: ChoiceOption, value: readonly string[]) {
  return html`
    <option
      value=${option.value}
      ?disabled=${option.disabled === true}
      .selected=${live(value.includes(option.value))}
    >
      ${option.label}
    </option>
  `;
}
