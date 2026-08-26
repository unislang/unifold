import type { ChoiceOption } from "@unislang/unifold-catalog";
import { css, html } from "lit";
import { live } from "lit/directives/live.js";

import { UnifoldScalarChoiceElement } from "./scalar-choice-element.js";
import { focusRing, hostDefaults, validationStyles } from "./styles.js";

/**
 * Selects one visible choice through a native fieldset and same-name radio inputs.
 *
 * @tagname unifold-radio-group
 * @fires unifold-event - Canonical radio selection and blur intents.
 * @cssprop --unifold-space-1 - Legend spacing.
 * @cssprop --unifold-space-2 - Option spacing.
 * @cssprop --unifold-control-min-height - Minimum pointer target height.
 * @cssprop --unifold-color-primary - Native radio accent color.
 */
export class UnifoldRadioGroup extends UnifoldScalarChoiceElement {
  static override styles = [
    hostDefaults,
    focusRing,
    validationStyles,
    css`
      fieldset {
        border: 0;
        display: grid;
        gap: var(--unifold-space-2, 0.5rem);
        margin: 0;
        padding: 0;
      }
      legend {
        font-weight: 600;
        margin-block-end: var(--unifold-space-1, 0.25rem);
      }
      label {
        align-items: center;
        cursor: pointer;
        display: flex;
        gap: var(--unifold-space-2, 0.5rem);
        min-height: var(--unifold-control-min-height, 2.75rem);
      }
      input {
        accent-color: var(--unifold-color-primary, #1d4ed8);
        block-size: 1.25rem;
        inline-size: 1.25rem;
      }
      :host([disabled]) fieldset {
        opacity: 0.55;
      }
    `
  ];

  protected override render() {
    const errorId = `${this.id}-error`;
    return html`
      <fieldset
        aria-describedby=${errorId}
        aria-invalid=${String(Boolean(this.errorMessage))}
        ?disabled=${this.formControl.disabled}
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
          .checked=${live(this.value === option.value)}
          name=${this.name}
          type="radio"
          value=${option.value}
          ?disabled=${option.disabled === true}
          ?required=${this.required}
          @change=${this.onChoiceChange}
          @blur=${this.onChoiceBlur}
        />
        <span>${option.label}</span>
      </label>
    `;
  }
}
