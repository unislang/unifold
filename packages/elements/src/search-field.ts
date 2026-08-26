import { MAXIMUM_SEARCH_QUERY_LENGTH, SearchFieldAutocomplete } from "@unislang/unifold-catalog";
import { html, type PropertyDeclarations } from "lit";

import { UnifoldScalarTextElement } from "./scalar-text-element.js";
import { singleLineInputStyles } from "./single-line-input-styles.js";

/**
 * Captures one plain-text query with native search semantics.
 *
 * @tagname unifold-search-field
 * @fires unifold-event - Canonical input and blur intents.
 * @cssprop --unifold-space-1 - Label and control spacing.
 * @cssprop --unifold-color-surface - Control background color.
 * @cssprop --unifold-color-border - Control border color.
 * @cssprop --unifold-radius-sm - Control corner radius.
 * @cssprop --unifold-color-text - Control text color.
 * @cssprop --unifold-control-min-height - Minimum control height.
 * @cssprop --unifold-color-danger - Invalid control border color.
 */
export class UnifoldSearchField extends UnifoldScalarTextElement {
  static override properties: PropertyDeclarations = {
    autocomplete: {},
    maxLength: { attribute: "maxlength", type: Number }
  };

  static override styles = singleLineInputStyles;

  declare autocomplete: SearchFieldAutocomplete;
  declare maxLength: number;

  constructor() {
    super();
    this.autocomplete = SearchFieldAutocomplete.Off;
    this.maxLength = MAXIMUM_SEARCH_QUERY_LENGTH;
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
          enterkeyhint="search"
          .value=${this.value}
          maxlength=${this.maxLength}
          name=${this.name}
          placeholder=${this.placeholder}
          type="search"
          ?disabled=${this.formControl.disabled}
          ?readonly=${this.readonly}
          ?required=${this.required}
          @input=${this.onSearchInput}
          @keydown=${this.onSearchKeyDown}
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
      autocomplete: this.autocomplete,
      maxLength: this.maxLength
    };
  }

  private readonly onSearchInput = (event: InputEvent): void => {
    const input = searchInput(event.currentTarget);
    if (input === undefined) return;
    if (input.value.length > this.maxLength) {
      input.value = this.value;
      return;
    }
    this.onTextInput(event);
  };

  private readonly onSearchKeyDown = (event: KeyboardEvent): void => {
    const form = this.form;
    if (form === null) return;
    if (!requestsSubmit(event)) return;
    event.preventDefault();
    form.requestSubmit();
  };
}

function searchInput(target: EventTarget | null): HTMLInputElement | undefined {
  if (!(target instanceof HTMLInputElement)) return undefined;
  if (target.type !== "search") return undefined;
  return target;
}

function requestsSubmit(event: KeyboardEvent): boolean {
  return event.key === "Enter" && !event.isComposing;
}
