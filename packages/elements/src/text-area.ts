import { TextAreaWrap } from "@unislang/unifold-catalog";
import { css, html, type PropertyDeclarations } from "lit";

import { UnifoldScalarTextElement } from "./scalar-text-element.js";
import { focusRing, hostDefaults, validationStyles } from "./styles.js";

/**
 * Captures multiline text with native editing and accessible validation projection.
 *
 * @tagname unifold-text-area
 * @fires unifold-event - Canonical multiline input and blur intents.
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
export class UnifoldTextArea extends UnifoldScalarTextElement {
  static override properties: PropertyDeclarations = {
    rows: { type: Number },
    wrap: {}
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
      textarea {
        background: var(--unifold-color-surface, #ffffff);
        border: 1px solid var(--unifold-color-border, #6b7280);
        border-radius: var(--unifold-radius-sm, 0.375rem);
        color: var(--unifold-color-text, #111827);
        font: inherit;
        min-height: calc(var(--unifold-control-min-height, 2.75rem) * 2);
        padding: var(--unifold-space-2, 0.5rem) var(--unifold-space-3, 0.75rem);
        resize: vertical;
        width: 100%;
      }
      textarea[aria-invalid="true"] {
        border-color: var(--unifold-color-danger, #b91c1c);
      }
    `
  ];

  declare rows: number;
  declare wrap: TextAreaWrap;

  constructor() {
    super();
    this.rows = 4;
    this.wrap = TextAreaWrap.Soft;
  }

  protected override render() {
    const errorId = `${this.id}-error`;
    return html`
      <label>
        <span>${this.label}</span>
        <textarea
          aria-describedby=${errorId}
          aria-invalid=${String(Boolean(this.errorMessage))}
          .rows=${this.rows}
          .value=${this.value}
          name=${this.name}
          placeholder=${this.placeholder}
          wrap=${this.wrap}
          ?disabled=${this.formControl.disabled}
          ?readonly=${this.readonly}
          ?required=${this.required}
          @input=${this.onTextInput}
          @compositionstart=${this.onCompositionStart}
          @compositionend=${this.onCompositionEnd}
          @blur=${this.onTextBlur}
        ></textarea>
      </label>
      <span id=${errorId} role="alert">${this.errorMessage}</span>
    `;
  }

  protected override eventProperties() {
    return { ...super.eventProperties(), rows: this.rows, wrap: this.wrap };
  }
}
