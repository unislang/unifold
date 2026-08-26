import {
  MAXIMUM_SEARCH_QUERY_LENGTH,
  type SearchResult,
  type SearchResultsValue
} from "@unislang/unifold-catalog";
import { UiUpdateTrigger, type JsonObject } from "@unislang/unifold-contracts";
import { html, nothing, type PropertyDeclarations, type PropertyValues } from "lit";
import { styleMap } from "lit/directives/style-map.js";

import { ElementEventType } from "./enums.js";
import {
  nextResultIndex,
  preferredResultIndex,
  resultScrollTop,
  resultWindow,
  type SearchResultsWindow
} from "./search-results-window.js";
import { searchResultsStyles } from "./search-results-styles.js";
import { UnifoldElement } from "./unifold-element.js";

/**
 * Captures one controlled search query and virtualizes a selectable result collection.
 *
 * @tagname unifold-search-results
 * @fires unifold-event - Canonical query, selection, and blur intents.
 * @csspart search - Native search field.
 * @csspart status - Polite loading or result-count status.
 * @csspart viewport - Scrollable result listbox.
 * @csspart result - A rendered result option.
 */
export class UnifoldSearchResults extends UnifoldElement {
  static override properties: PropertyDeclarations = {
    activeIndex: { state: true },
    asyncValidators: { attribute: false },
    disabled: { reflect: true, type: Boolean },
    emptyMessage: { attribute: "empty-message" },
    errorMessage: { attribute: "error-message" },
    itemHeight: { attribute: "item-height", type: Number },
    label: {},
    loading: { reflect: true, type: Boolean },
    loadingMessage: { attribute: "loading-message" },
    maxLength: { attribute: "maxlength", reflect: true, type: Number },
    name: {},
    overscan: { type: Number },
    placeholder: {},
    results: { attribute: false },
    resultsLabel: { attribute: "results-label" },
    updateOn: { attribute: "update-on" },
    validators: { attribute: false },
    value: { attribute: false },
    viewportHeight: { attribute: "viewport-height", type: Number },
    viewportScrollTop: { state: true }
  };

  static override styles = searchResultsStyles;

  declare activeIndex: number;
  declare asyncValidators: readonly string[];
  declare disabled: boolean;
  declare emptyMessage: string;
  declare errorMessage: string;
  declare itemHeight: number;
  declare label: string;
  declare loading: boolean;
  declare loadingMessage: string;
  declare maxLength: number;
  declare name: string;
  declare overscan: number;
  declare placeholder: string;
  declare results: readonly SearchResult[];
  declare resultsLabel: string;
  declare updateOn: UiUpdateTrigger;
  declare validators: readonly string[];
  declare value: SearchResultsValue;
  declare viewportHeight: number;
  declare viewportScrollTop: number;

  constructor() {
    super();
    this.activeIndex = -1;
    this.asyncValidators = [];
    this.disabled = false;
    this.emptyMessage = "No results";
    this.errorMessage = "";
    this.itemHeight = 72;
    this.label = "";
    this.loading = false;
    this.loadingMessage = "Loading results";
    this.maxLength = MAXIMUM_SEARCH_QUERY_LENGTH;
    this.name = "";
    this.overscan = 4;
    this.placeholder = "";
    this.results = [];
    this.resultsLabel = "Search results";
    this.updateOn = UiUpdateTrigger.Input;
    this.validators = [];
    this.value = { query: "", selectedResultId: "" };
    this.viewportHeight = 480;
    this.viewportScrollTop = 0;
  }

  protected override willUpdate(changed: PropertyValues): void {
    if (searchDataUnchanged(changed)) return;
    const previousResults = changed.get("results") as readonly SearchResult[] | undefined;
    const previousId = previousActiveId(previousResults, this.activeIndex);
    this.activeIndex = preferredResultIndex(this.results, this.value.selectedResultId, previousId);
  }

  protected override render() {
    const errorId = `${this.id}-error`;
    return html`<div @focusout=${this.onFocusOut}>
      ${this.renderSearchField(errorId)}
      <p part="status" role="status" aria-live="polite">${this.statusText()}</p>
      ${this.renderViewport()}
      <span id=${errorId} role="alert">${this.errorMessage}</span>
    </div>`;
  }

  private renderSearchField(errorId: string) {
    return html`<label>
      <span>${this.label}</span>
      <input
        part="search"
        type="search"
        enterkeyhint="search"
        maxlength=${this.maxLength}
        name=${this.name}
        placeholder=${this.placeholder}
        .value=${this.value.query}
        ?disabled=${this.disabled}
        aria-controls=${`${this.id}-results`}
        aria-describedby=${errorId}
        aria-invalid=${String(Boolean(this.errorMessage))}
        @input=${this.onQueryInput}
      />
    </label>`;
  }

  private renderViewport() {
    const range = resultWindow(this);
    return html`<div
      id=${`${this.id}-results`}
      part="viewport"
      role="listbox"
      tabindex=${this.disabled ? "-1" : "0"}
      aria-label=${this.resultsLabel}
      aria-busy=${String(this.loading)}
      aria-disabled=${String(this.disabled)}
      aria-activedescendant=${activeResultId(this.id, this.activeIndex, range)}
      style=${styleMap({ height: `${this.viewportHeight}px` })}
      @scroll=${this.onScroll}
      @keydown=${this.onKeyDown}
    >
      ${this.renderWindow(range)}
    </div>`;
  }

  private renderWindow(range: SearchResultsWindow) {
    if (this.results.length === 0) return html`<p part="empty">${this.emptyMessage}</p>`;
    const spacerStyles = { height: `${this.results.length * this.itemHeight}px` };
    const windowStyles = { transform: `translateY(${range.start * this.itemHeight}px)` };
    return html`<div part="spacer" aria-hidden="true" style=${styleMap(spacerStyles)}></div>
      <div part="window" style=${styleMap(windowStyles)} @click=${this.onResultClick}>
        ${range.results.map((result, offset) => this.renderResult(result, range.start + offset))}
      </div>`;
  }

  protected override eventProperties(): JsonObject {
    return {
      asyncValidators: this.asyncValidators,
      disabled: this.disabled,
      emptyMessage: this.emptyMessage,
      errorMessage: this.errorMessage,
      itemHeight: this.itemHeight,
      label: this.label,
      loading: this.loading,
      loadingMessage: this.loadingMessage,
      maxLength: this.maxLength,
      name: this.name,
      overscan: this.overscan,
      placeholder: this.placeholder,
      results: this.results,
      resultsLabel: this.resultsLabel,
      updateOn: this.updateOn,
      validators: this.validators,
      value: this.value,
      viewportHeight: this.viewportHeight
    };
  }

  protected override eventValue() {
    return this.value;
  }

  moveActive(delta: number): void {
    this.activeIndex = nextResultIndex(this.results.length, this.activeIndex, delta);
    this.revealActive();
  }

  selectActive(): void {
    const result = this.results[this.activeIndex];
    if (result !== undefined) this.commitValue({ ...this.value, selectedResultId: result.id });
  }

  private renderResult(result: SearchResult, index: number) {
    return html`<div
      id=${resultId(this.id, index)}
      part="result"
      role="option"
      data-result-index=${String(index)}
      aria-posinset=${String(index + 1)}
      aria-setsize=${String(this.results.length)}
      aria-selected=${String(result.id === this.value.selectedResultId)}
      style=${styleMap({ height: `${this.itemHeight}px` })}
    >
      <span part="title">${result.title}</span>
      ${result.description === undefined
        ? nothing
        : html`<span part="description">${result.description}</span>`}
    </div>`;
  }

  private statusText(): string {
    if (this.loading) return this.loadingMessage;
    const count = this.results.length;
    return `${count} ${count === 1 ? "result" : "results"}`;
  }

  private readonly onQueryInput = (event: Event): void => {
    const input = event.currentTarget as HTMLInputElement;
    if (input.value.length > this.maxLength) {
      input.value = this.value.query;
      return;
    }
    const query = input.value;
    this.commitValue({ query, selectedResultId: "" });
  };

  private readonly onScroll = (event: Event): void => {
    this.viewportScrollTop = (event.currentTarget as HTMLElement).scrollTop;
  };

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    const action = keyAction(this, event.key);
    if (action === undefined) return;
    event.preventDefault();
    action();
  };

  private readonly onResultClick = (event: Event): void => {
    const target = (event.target as Element).closest<HTMLElement>("[data-result-index]");
    if (target === null || this.disabled) return;
    this.activeIndex = Number(target.dataset["resultIndex"]);
    this.selectActive();
  };

  private readonly onFocusOut = (event: FocusEvent): void => {
    const container = event.currentTarget as HTMLElement;
    if (event.relatedTarget instanceof Node && container.contains(event.relatedTarget)) return;
    this.emitUiEvent(ElementEventType.ControlBlurred, { value: this.value });
  };

  private commitValue(value: SearchResultsValue): void {
    if (this.disabled) return;
    this.value = value;
    this.emitUiEvent(ElementEventType.ControlInput, { value });
  }

  private revealActive(): void {
    const root = this.shadowRoot;
    if (root === null) return;
    const viewport = root.querySelector<HTMLElement>("[part=viewport]");
    if (viewport === null) return;
    this.viewportScrollTop = resultScrollTop(this, resultWindow(this));
    viewport.scrollTop = this.viewportScrollTop;
  }
}

function searchDataUnchanged(changed: PropertyValues): boolean {
  return !(changed.has("results") || changed.has("value"));
}

function previousActiveId(results: readonly SearchResult[] | undefined, index: number): string {
  if (results === undefined) return "";
  const result = results[index];
  return result === undefined ? "" : result.id;
}

function keyAction(list: UnifoldSearchResults, key: string): (() => void) | undefined {
  const actions: Readonly<Record<string, () => void>> = {
    ArrowDown: () => list.moveActive(1),
    ArrowUp: () => list.moveActive(-1),
    Enter: () => list.selectActive(),
    " ": () => list.selectActive()
  };
  return actions[key];
}

function resultId(id: string, index: number): string {
  return `${id}__result_${index}`;
}

function activeResultId(id: string, index: number, range: SearchResultsWindow): string {
  return index >= range.start && index < range.end ? resultId(id, index) : "";
}
