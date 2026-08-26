import type { ChoiceOption } from "@unislang/unifold-catalog";
import { UiUpdateTrigger, type JsonObject } from "@unislang/unifold-contracts";
import { html, nothing, type PropertyDeclarations, type PropertyValues } from "lit";
import { live } from "lit/directives/live.js";

import { ElementEventType } from "./enums.js";
import { comboboxStyles, focusRing, hostDefaults, validationStyles } from "./styles.js";
import { UnifoldElement } from "./unifold-element.js";

const MAX_RENDERED_OPTIONS = 200;

interface IndexedOption {
  readonly index: number;
  readonly option: ChoiceOption;
}

/**
 * Filters and selects one registered value through an editable ARIA combobox.
 *
 * The query, popup state, and active descendant are interaction-local. Only an explicit registered
 * option selection or clear intent changes the runtime-owned value.
 *
 * @tagname unifold-combobox
 * @fires unifold-event - Canonical selection and blur intents.
 * @cssprop --unifold-space-1 - Label and control spacing.
 * @cssprop --unifold-color-surface - Control and popup background color.
 * @cssprop --unifold-color-border - Control and popup border color.
 * @cssprop --unifold-radius-sm - Control and popup corner radius.
 * @cssprop --unifold-color-text - Control text color.
 * @cssprop --unifold-color-primary - Active option background color.
 * @cssprop --unifold-space-2 - Option block padding.
 * @cssprop --unifold-space-3 - Control inline padding.
 */
export class UnifoldCombobox extends UnifoldElement {
  static override properties: PropertyDeclarations = {
    activeOptionIndex: { attribute: false, state: true },
    asyncValidators: { attribute: false },
    disabled: { reflect: true, type: Boolean },
    errorMessage: { attribute: "error-message" },
    label: {},
    name: {},
    noResultsMessage: { attribute: "no-results-message" },
    open: { attribute: false, state: true },
    options: { attribute: false },
    placeholder: {},
    query: { attribute: false, state: true },
    required: { reflect: true, type: Boolean },
    updateOn: { attribute: "update-on" },
    validators: { attribute: false },
    value: {}
  };

  static override styles = [hostDefaults, focusRing, validationStyles, comboboxStyles];

  declare asyncValidators: readonly string[];
  declare disabled: boolean;
  declare errorMessage: string;
  declare label: string;
  declare name: string;
  declare noResultsMessage: string;
  declare options: readonly ChoiceOption[];
  declare placeholder: string;
  declare required: boolean;
  declare updateOn: UiUpdateTrigger;
  declare validators: readonly string[];
  declare value: string;
  declare activeOptionIndex: number;
  declare open: boolean;
  declare query: string;

  constructor() {
    super();
    this.activeOptionIndex = -1;
    this.asyncValidators = [];
    this.disabled = false;
    this.errorMessage = "";
    this.label = "";
    this.name = "";
    this.noResultsMessage = "No matching options";
    this.open = false;
    this.options = [];
    this.placeholder = "";
    this.query = "";
    this.required = false;
    this.updateOn = UiUpdateTrigger.Input;
    this.validators = [];
    this.value = "";
  }

  protected override willUpdate(changed: PropertyValues<this>): void {
    if (changed.has("options") || changed.has("value")) this.synchronizeSelection();
  }

  protected override render() {
    const errorId = `${this.id}-error`;
    const inputId = `${this.id}-input`;
    const listboxId = `${this.id}-listbox`;
    const matches = this.filteredOptions();
    return html`
      ${this.renderField({ errorId, inputId, listboxId }, matches)}
      <span id=${errorId} role="alert">${this.errorMessage}</span>
    `;
  }

  private renderField(
    ids: Readonly<{ errorId: string; inputId: string; listboxId: string }>,
    matches: readonly IndexedOption[]
  ) {
    return html`
      <div class="field">
        <label for=${ids.inputId}>${this.label}</label>
        ${this.renderInput(ids)} ${this.renderListbox(ids.listboxId, matches)}
        ${this.renderEmptyState(matches)}
      </div>
    `;
  }

  private renderInput(ids: Readonly<{ errorId: string; inputId: string; listboxId: string }>) {
    return html`<input
      id=${ids.inputId}
      aria-activedescendant=${this.activeOptionId() ?? nothing}
      aria-autocomplete="list"
      aria-controls=${ids.listboxId}
      aria-describedby=${ids.errorId}
      aria-expanded=${String(this.open)}
      aria-invalid=${String(Boolean(this.errorMessage))}
      autocomplete="off"
      name=${this.name}
      placeholder=${this.placeholder}
      role="combobox"
      .value=${live(this.query)}
      ?disabled=${this.disabled}
      ?required=${this.required}
      @blur=${this.onBlur}
      @input=${this.onInput}
      @keydown=${this.onKeyDown}
    />`;
  }

  private renderListbox(listboxId: string, matches: readonly IndexedOption[]) {
    const rendered = matches.slice(0, MAX_RENDERED_OPTIONS);
    return html`<div id=${listboxId} role="listbox" aria-label=${this.label} ?hidden=${!this.open}>
      ${rendered.map((match, position) => this.renderOption(match, position, matches.length))}
    </div>`;
  }

  private renderEmptyState(matches: readonly IndexedOption[]) {
    if (!this.open || matches.length !== 0) return nothing;
    return html`<div part="empty" role="status">${this.noResultsMessage}</div>`;
  }

  protected override eventProperties(): JsonObject {
    return {
      ...super.eventProperties(),
      asyncValidators: this.asyncValidators,
      disabled: this.disabled,
      errorMessage: this.errorMessage,
      label: this.label,
      name: this.name,
      noResultsMessage: this.noResultsMessage,
      options: this.options,
      placeholder: this.placeholder,
      required: this.required,
      updateOn: this.updateOn,
      validators: this.validators,
      value: this.value
    };
  }

  protected override eventValue() {
    return this.value;
  }

  private renderOption(match: IndexedOption, position: number, setSize: number) {
    const { index, option } = match;
    return html`
      <div
        id=${this.optionId(index)}
        role="option"
        aria-disabled=${String(option.disabled === true)}
        aria-posinset=${String(position + 1)}
        aria-selected=${String(option.value === this.value)}
        aria-setsize=${String(setSize)}
        ?data-active=${index === this.activeOptionIndex}
        @click=${() => this.onOptionClick(index)}
        @pointerdown=${this.onOptionPointerDown}
      >
        ${option.label}
      </div>
    `;
  }

  private readonly onInput = (event: InputEvent): void => {
    this.query = (event.currentTarget as HTMLInputElement).value;
    this.open = true;
    this.activeOptionIndex = this.firstEnabledIndex();
    if (this.query === "" && this.value !== "") this.commitValue("");
  };

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    this.keyHandlers.get(event.key)?.(event);
  };

  private readonly keyHandlers = new Map<string, (event: KeyboardEvent) => void>([
    ["ArrowDown", (event) => this.moveFromKey(event)],
    ["ArrowUp", (event) => this.moveFromKey(event)],
    ["Enter", (event) => this.commitActiveWhenOpen(event)],
    ["Escape", (event) => this.escapeWhenOpen(event)],
    ["Home", (event) => this.moveToEdgeWhenOpen(event, false)],
    ["End", (event) => this.moveToEdgeWhenOpen(event, true)]
  ]);

  private readonly onBlur = (): void => {
    this.closePopup(true);
    this.emitUiEvent(ElementEventType.ControlBlurred, { value: this.value });
  };

  private moveFromKey(event: KeyboardEvent): void {
    event.preventDefault();
    const direction = event.key === "ArrowDown" ? 1 : -1;
    if (!this.open) {
      this.query = "";
      this.open = true;
      this.activeOptionIndex = this.edgeEnabledIndex(direction < 0);
      return;
    }
    this.activeOptionIndex = this.adjacentEnabledIndex(direction);
  }

  private commitActive(event: KeyboardEvent): void {
    event.preventDefault();
    const option = this.options[this.activeOptionIndex];
    if (option !== undefined && option.disabled !== true) this.commitOption(option);
  }

  private commitActiveWhenOpen(event: KeyboardEvent): void {
    if (this.open) this.commitActive(event);
  }

  private escape(event: KeyboardEvent): void {
    event.preventDefault();
    this.closePopup(true);
  }

  private escapeWhenOpen(event: KeyboardEvent): void {
    if (this.open) this.escape(event);
  }

  private moveToEdge(event: KeyboardEvent, last: boolean): void {
    event.preventDefault();
    this.activeOptionIndex = this.edgeEnabledIndex(last);
  }

  private moveToEdgeWhenOpen(event: KeyboardEvent, last: boolean): void {
    if (this.open) this.moveToEdge(event, last);
  }

  private readonly onOptionPointerDown = (event: PointerEvent): void => {
    event.preventDefault();
  };

  private onOptionClick(index: number): void {
    const option = this.options[index];
    if (option !== undefined && option.disabled !== true) this.commitOption(option);
  }

  private commitOption(option: ChoiceOption): void {
    this.value = option.value;
    this.query = option.label;
    this.closePopup(false);
    this.emitUiEvent(ElementEventType.ControlInput, { value: option.value });
  }

  private commitValue(value: string): void {
    this.value = value;
    this.emitUiEvent(ElementEventType.ControlInput, { value });
  }

  private closePopup(restoreLabel: boolean): void {
    this.open = false;
    this.activeOptionIndex = -1;
    if (restoreLabel) this.query = this.selectedLabel();
  }

  private synchronizeSelection(): void {
    if (!this.open) this.query = this.selectedLabel();
    if (this.options[this.activeOptionIndex] === undefined) this.activeOptionIndex = -1;
  }

  private filteredOptions(): readonly IndexedOption[] {
    const query = this.query.trim().toLowerCase();
    return this.options.flatMap((option, index) => {
      if (query !== "" && !option.label.toLowerCase().includes(query)) return [];
      return [{ index, option }];
    });
  }

  private firstEnabledIndex(): number {
    return this.edgeEnabledIndex(false);
  }

  private edgeEnabledIndex(last: boolean): number {
    const enabled = this.navigableOptions();
    return indexedOptionIndex(last ? enabled.at(-1) : enabled[0]);
  }

  private adjacentEnabledIndex(direction: 1 | -1): number {
    const enabled = this.navigableOptions();
    if (enabled.length === 0) return -1;
    const current = enabled.findIndex(({ index }) => index === this.activeOptionIndex);
    const next = adjacentIndex(enabled.length, current, direction);
    return (enabled[(next + enabled.length) % enabled.length] as IndexedOption).index;
  }

  private selectedLabel(): string {
    return this.options.find(({ value }) => value === this.value)?.label ?? "";
  }

  private navigableOptions(): readonly IndexedOption[] {
    return this.filteredOptions()
      .slice(0, MAX_RENDERED_OPTIONS)
      .filter(({ option }) => option.disabled !== true);
  }

  private activeOptionId(): string | undefined {
    return this.activeOptionIndex < 0 ? undefined : this.optionId(this.activeOptionIndex);
  }

  private optionId(index: number): string {
    return `${this.id}-option-${index}`;
  }
}

function indexedOptionIndex(option: IndexedOption | undefined): number {
  if (option === undefined) return -1;
  return option.index;
}

function adjacentIndex(length: number, current: number, direction: 1 | -1): number {
  if (current >= 0) return current + direction;
  return direction === 1 ? 0 : length - 1;
}
