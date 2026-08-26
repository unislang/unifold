import { TextFieldInputType } from "@unislang/unifold-catalog";
import { html, type PropertyDeclarations } from "lit";

import { UnifoldScalarTextElement } from "./scalar-text-element.js";
import { singleLineInputStyles } from "./single-line-input-styles.js";

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

  static override styles = singleLineInputStyles;

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
          ?disabled=${this.formControl.disabled}
          ?readonly=${this.readonly}
          ?required=${this.required}
          @input=${this.onTextInput}
          @compositionstart=${this.onCompositionStart}
          @compositionend=${this.onCompositionEnd}
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
