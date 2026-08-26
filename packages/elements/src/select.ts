import { css, html } from "lit";

import { UnifoldScalarChoiceElement } from "./scalar-choice-element.js";
import { focusRing, hostDefaults, validationStyles } from "./styles.js";

/**
 * Selects one registered option through a native accessible select control.
 *
 * @tagname unifold-select
 * @fires unifold-event - Canonical selection and blur intents.
 * @cssprop --unifold-space-1 - Label and control spacing.
 * @cssprop --unifold-color-surface - Control background color.
 * @cssprop --unifold-color-border - Control border color.
 * @cssprop --unifold-radius-sm - Control corner radius.
 * @cssprop --unifold-color-text - Control text color.
 * @cssprop --unifold-control-min-height - Minimum control height.
 * @cssprop --unifold-space-2 - Block-axis control padding.
 * @cssprop --unifold-space-3 - Inline-axis control padding.
 */
export class UnifoldSelect extends UnifoldScalarChoiceElement {
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
        min-height: var(--unifold-control-min-height, 2.75rem);
        padding: var(--unifold-space-2, 0.5rem) var(--unifold-space-3, 0.75rem);
      }
    `
  ];

  protected override render() {
    const errorId = `${this.id}-error`;
    return html`
      <label>
        <span>${this.label}</span>
        <select
          aria-describedby=${errorId}
          aria-invalid=${String(Boolean(this.errorMessage))}
          .value=${this.value}
          name=${this.name}
          ?disabled=${this.disabled}
          ?required=${this.required}
          @change=${this.onChoiceChange}
          @blur=${this.onChoiceBlur}
        >
          ${this.options.map(
            (option) => html`
              <option value=${option.value} ?disabled=${option.disabled === true}>
                ${option.label}
              </option>
            `
          )}
        </select>
      </label>
      <span id=${errorId} role="alert">${this.errorMessage}</span>
    `;
  }
}
