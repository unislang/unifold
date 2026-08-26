import type { ChoiceOption } from "@unislang/unifold-catalog";
import type { JsonObject } from "@unislang/unifold-contracts";
import { css, html, type PropertyDeclarations, type PropertyValues } from "lit";
import { styleMap } from "lit/directives/style-map.js";

import { UnifoldScalarChoiceElement } from "./scalar-choice-element.js";
import { focusRing, hostDefaults, validationStyles } from "./styles.js";

const MAX_RENDERED_OPTIONS = 200;

/**
 * Presents a bounded DOM window over a large validated option collection.
 *
 * @tagname unifold-virtual-list
 * @fires unifold-event - Canonical selection and blur intents.
 * @csspart viewport - Scrollable listbox viewport.
 * @csspart option - A rendered option in the current virtual window.
 */
export class UnifoldVirtualList extends UnifoldScalarChoiceElement {
  static override properties: PropertyDeclarations = {
    itemHeight: { attribute: "item-height", type: Number },
    overscan: { type: Number },
    viewportHeight: { attribute: "viewport-height", type: Number },
    activeIndex: { state: true },
    viewportScrollTop: { state: true }
  };

  static override styles = [
    hostDefaults,
    focusRing,
    validationStyles,
    css`
      :host {
        display: block;
      }
      [part="viewport"] {
        overflow: auto;
        position: relative;
      }
      [part="spacer"] {
        pointer-events: none;
        width: 1px;
      }
      [part="window"] {
        left: 0;
        position: absolute;
        right: 0;
        top: 0;
      }
      [part="option"] {
        align-items: center;
        display: flex;
        padding-inline: var(--unifold-space-3, 0.75rem);
      }
      [part="option"][aria-selected="true"] {
        background: var(--unifold-color-surface-subtle, #f3f4f6);
      }
      [part="option"][aria-disabled="true"] {
        opacity: 0.55;
      }
    `
  ];

  declare itemHeight: number;
  declare overscan: number;
  declare viewportHeight: number;
  declare activeIndex: number;
  declare viewportScrollTop: number;

  constructor() {
    super();
    this.activeIndex = -1;
    this.itemHeight = 40;
    this.overscan = 4;
    this.viewportHeight = 400;
    this.viewportScrollTop = 0;
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed);
    if (!changed.has("options") && !changed.has("value")) return;
    this.activeIndex = preferredIndex(this.options, this.value);
  }

  protected override render() {
    const range = visibleRange(this);
    const viewportStyles = { height: `${this.viewportHeight}px` };
    const spacerStyles = { height: `${this.options.length * this.itemHeight}px` };
    const windowStyles = { transform: `translateY(${range.start * this.itemHeight}px)` };
    return html`
      <span>${this.label}</span>
      <div
        part="viewport"
        role="listbox"
        tabindex="0"
        aria-label=${this.label}
        aria-disabled=${String(this.formControl.disabled)}
        aria-required=${String(this.required)}
        aria-activedescendant=${activeId(this.id, this.activeIndex, range)}
        style=${styleMap(viewportStyles)}
        @scroll=${this.onScroll}
        @keydown=${this.onKeyDown}
        @blur=${this.onChoiceBlur}
      >
        <div part="spacer" aria-hidden="true" style=${styleMap(spacerStyles)}></div>
        <div part="window" style=${styleMap(windowStyles)} @click=${this.onOptionClick}>
          ${range.options.map((option, offset) => this.renderOption(option, range.start + offset))}
        </div>
      </div>
      <span role="alert">${this.errorMessage}</span>
    `;
  }

  protected override eventProperties(): JsonObject {
    return {
      ...super.eventProperties(),
      itemHeight: this.itemHeight,
      overscan: this.overscan,
      viewportHeight: this.viewportHeight
    };
  }

  private renderOption(option: ChoiceOption, index: number) {
    const styles = { height: `${this.itemHeight}px` };
    return html`<div
      id=${optionId(this.id, index)}
      part="option"
      role="option"
      data-option-index=${String(index)}
      aria-posinset=${String(index + 1)}
      aria-setsize=${String(this.options.length)}
      aria-selected=${String(option.value === this.value)}
      aria-disabled=${String(option.disabled === true)}
      style=${styleMap(styles)}
    >
      ${option.label}
    </div>`;
  }

  private readonly onScroll = (event: Event): void => {
    this.viewportScrollTop = (event.currentTarget as HTMLElement).scrollTop;
    const range = visibleRange(this);
    if (this.activeIndex < range.start || this.activeIndex >= range.end) {
      this.activeIndex = firstEnabled(this.options, range.start, range.end);
    }
  };

  private readonly onOptionClick = (event: Event): void => {
    const target = (event.target as Element).closest<HTMLElement>("[data-option-index]");
    if (target === null) return;
    this.selectIndex(Number(target.dataset["optionIndex"]));
  };

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    const action = keyAction(this, event.key);
    if (action === undefined) return;
    event.preventDefault();
    action();
  };

  moveActive(delta: number): void {
    this.activeIndex = nextEnabled(this.options, this.activeIndex, delta);
    this.revealActive();
  }

  selectActive(): void {
    this.selectIndex(this.activeIndex);
  }

  private selectIndex(index: number): void {
    const option = this.options[index];
    if (!canSelect(this.formControl.disabled, option)) return;
    this.activeIndex = index;
    this.formControl.commitInput(option.value);
  }

  private revealActive(): void {
    const root = this.shadowRoot;
    if (root === null) return;
    const viewport = root.querySelector<HTMLElement>("[part=viewport]");
    if (viewport === null) return;
    this.viewportScrollTop = targetScrollTop(this, visibleRange(this), this.activeIndex);
    viewport.scrollTop = this.viewportScrollTop;
  }
}

interface VisibleRange {
  readonly end: number;
  readonly options: readonly ChoiceOption[];
  readonly start: number;
}

function visibleRange(list: UnifoldVirtualList): VisibleRange {
  const visible = Math.ceil(list.viewportHeight / list.itemHeight);
  const count = Math.min(MAX_RENDERED_OPTIONS, visible + list.overscan * 2);
  const initial = Math.max(0, Math.floor(readScrollTop(list) / list.itemHeight) - list.overscan);
  const end = Math.min(list.options.length, initial + count);
  const start = Math.max(0, end - count);
  return { end, options: list.options.slice(start, end), start };
}

function readScrollTop(list: UnifoldVirtualList): number {
  return list.viewportScrollTop;
}

function preferredIndex(options: readonly ChoiceOption[], value: string): number {
  const selected = options.findIndex((option) => option.value === value);
  return selected >= 0 ? selected : firstEnabled(options, 0, options.length);
}

function firstEnabled(options: readonly ChoiceOption[], start: number, end: number): number {
  return options.findIndex(
    (option, index) => index >= start && index < end && option.disabled !== true
  );
}

function nextEnabled(options: readonly ChoiceOption[], current: number, delta: number): number {
  const order = Array.from({ length: options.length }, (_, offset) =>
    wrappedIndex(current + delta * (offset + 1), options.length)
  );
  return order.find((index) => selectable(options[index])) ?? current;
}

function wrappedIndex(index: number, length: number): number {
  return (index + length * 2) % length;
}

function selectable(option: ChoiceOption | undefined): boolean {
  return option !== undefined && option.disabled !== true;
}

function canSelect(disabled: boolean, option: ChoiceOption | undefined): option is ChoiceOption {
  return !disabled && selectable(option);
}

function keyAction(list: UnifoldVirtualList, key: string): (() => void) | undefined {
  const actions: Readonly<Record<string, () => void>> = {
    ArrowDown: () => list.moveActive(1),
    ArrowUp: () => list.moveActive(-1),
    Enter: () => list.selectActive(),
    " ": () => list.selectActive()
  };
  return actions[key];
}

function targetScrollTop(
  list: UnifoldVirtualList,
  range: VisibleRange,
  activeIndex: number
): number {
  if (activeIndex < range.start) return activeIndex * list.itemHeight;
  if (activeIndex >= range.end)
    return (activeIndex - (range.end - range.start) + 1) * list.itemHeight;
  return readScrollTop(list);
}

function optionId(id: string, index: number): string {
  return `${id}__option_${index}`;
}

function activeId(id: string, index: number, range: VisibleRange): string {
  return index >= range.start && index < range.end ? optionId(id, index) : "";
}
