import { TextFieldInputType } from "@unislang/unifold-catalog";
import { css, html, type PropertyDeclarations } from "lit";

import { UnifoldScalarTextElement } from "./scalar-text-element.js";
import { focusRing, hostDefaults, validationStyles } from "./styles.js";

/**
 * Captures a single-line scalar value with accessible validation projection.
 *
 * @tagname unifold-text-field
 * @fires unifold-event - Canonical input and blur intents.
 * @cssprop --unifold-space-1 - Label and control spacing.
 * @cssprop --unifold-color-surface - Control background color.
 * @cssprop --unifold-color-border - Control border color.
 * @cssprop --unifold-radius-sm - Control corner radius.
 * @cssprop --unifold-color-text - Control text color.
 * @cssprop --unifold-control-min-height - Minimum control height.
 * @cssprop --unifold-space-2 - Block-axis control padding.
 * @cssprop --unifold-space-3 - Inline-axis control padding.
 * @cssprop --unifold-color-danger - Invalid control border color.
 */
export class UnifoldTextField extends UnifoldScalarTextElement {
  static override properties: PropertyDeclarations = {
    inputType: { attribute: "input-type" }
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
      input {
        background: var(--unifold-color-surface, #ffffff);
        border: 1px solid var(--unifold-color-border, #6b7280);
        border-radius: var(--unifold-radius-sm, 0.375rem);
        color: var(--unifold-color-text, #111827);
        font: inherit;
        min-height: var(--unifold-control-min-height, 2.75rem);
        padding: var(--unifold-space-2, 0.5rem) var(--unifold-space-3, 0.75rem);
      }
      input[aria-invalid="true"] {
        border-color: var(--unifold-color-danger, #b91c1c);
      }
    `
  ];

  declare inputType: TextFieldInputType;

  constructor() {
    super();
    this.inputType = TextFieldInputType.Text;
  }

  protected override render() {
    const errorId = `${this.id}-error`;
    return html`
      <label>
        <span>${this.label}</span>
        <input
          aria-describedby=${errorId}
          aria-invalid=${String(Boolean(this.errorMessage))}
          .value=${this.value}
          name=${this.name}
          placeholder=${this.placeholder}
          type=${this.inputType}
          ?disabled=${this.disabled}
          ?readonly=${this.readonly}
          ?required=${this.required}
          @input=${this.onTextInput}
          @blur=${this.onTextBlur}
        />
      </label>
      <span id=${errorId} role="alert">${this.errorMessage}</span>
    `;
  }

  protected override eventProperties() {
    return {
      ...super.eventProperties(),
      inputType: this.inputType
    };
  }
}
