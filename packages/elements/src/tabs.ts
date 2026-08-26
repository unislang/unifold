import { StepperOrientation, TabActivationMode, type TabItem } from "@unislang/unifold-catalog";
import { UiUpdateTrigger, type JsonObject } from "@unislang/unifold-contracts";
import { html, type PropertyDeclarations, type PropertyValues } from "lit";

import { ElementEventType } from "./enums.js";
import { preferredStepIndex } from "./step-navigation.js";
import { focusRing, hostDefaults, tabStyles, validationStyles } from "./styles.js";
import { keyboardTabIndex } from "./tab-navigation.js";
import { UnifoldElement } from "./unifold-element.js";

/**
 * Switches among stable authored panels through a controlled ARIA tabs model.
 *
 * @tagname unifold-tabs
 * @slot - One authored child panel for every tab, in matching order.
 * @fires unifold-event - Canonical tab-selection and blur intents.
 * @csspart tablist - Labeled tab-list container.
 * @csspart tab - One roving-focus tab button.
 * @csspart panel - One stable tab panel.
 */
export class UnifoldTabs extends UnifoldElement {
  static override properties: PropertyDeclarations = {
    activationMode: { attribute: "activation-mode", reflect: true },
    activeFocusIndex: { attribute: false, state: true },
    asyncValidators: { attribute: false },
    disabled: { reflect: true, type: Boolean },
    errorMessage: { attribute: "error-message" },
    label: {},
    name: {},
    orientation: { reflect: true },
    tabs: { attribute: false },
    updateOn: { attribute: "update-on" },
    validators: { attribute: false },
    value: {}
  };

  static override styles = [hostDefaults, focusRing, validationStyles, tabStyles];

  declare activationMode: TabActivationMode;
  declare activeFocusIndex: number;
  declare asyncValidators: readonly string[];
  declare disabled: boolean;
  declare errorMessage: string;
  declare label: string;
  declare name: string;
  declare orientation: StepperOrientation;
  declare tabs: readonly TabItem[];
  declare updateOn: UiUpdateTrigger;
  declare validators: readonly string[];
  declare value: string;

  constructor() {
    super();
    this.activationMode = TabActivationMode.Automatic;
    this.activeFocusIndex = 0;
    this.asyncValidators = [];
    this.disabled = false;
    this.errorMessage = "";
    this.label = "";
    this.name = "";
    this.orientation = StepperOrientation.Horizontal;
    this.tabs = [];
    this.updateOn = UiUpdateTrigger.Input;
    this.validators = [];
    this.value = "";
  }

  protected override willUpdate(changed: PropertyValues): void {
    if (!navigationChanged(changed)) return;
    const previous = changed.get("tabs") as readonly TabItem[] | undefined;
    const previousId = previousTabId(previous, this.activeFocusIndex);
    this.activeFocusIndex = preferredStepIndex(this.tabs, this.value, previousId);
  }

  protected override render() {
    return html`<div @focusout=${this.onFocusOut}>
      ${this.renderTabList()} ${this.tabs.map((tab, index) => this.renderPanel(tab, index))}
      <span id=${`${this.id}-error`} role="alert">${this.errorMessage}</span>
    </div>`;
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed);
    this.assignPanelSlots();
  }

  protected override eventProperties(): JsonObject {
    return {
      activationMode: this.activationMode,
      asyncValidators: this.asyncValidators,
      disabled: this.disabled,
      errorMessage: this.errorMessage,
      label: this.label,
      name: this.name,
      orientation: this.orientation,
      tabs: this.tabs,
      updateOn: this.updateOn,
      validators: this.validators,
      value: this.value
    };
  }

  protected override eventValue() {
    return this.value;
  }

  private renderTabList() {
    return html`<div
      part="tablist"
      role="tablist"
      aria-label=${this.label}
      aria-orientation=${this.orientation}
      @click=${this.onTabClick}
      @keydown=${this.onKeyDown}
    >
      ${this.tabs.map((tab, index) => this.renderTab(tab, index))}
    </div>`;
  }

  private renderTab(tab: TabItem, index: number) {
    const selected = tab.id === this.value;
    return html`<button
      id=${tabId(this.id, index)}
      part="tab"
      role="tab"
      type="button"
      data-tab-index=${String(index)}
      aria-controls=${panelId(this.id, index)}
      aria-selected=${String(selected)}
      tabindex=${index === this.activeFocusIndex ? "0" : "-1"}
      ?disabled=${this.disabled || tab.disabled === true}
    >
      ${tab.label}
    </button>`;
  }

  private renderPanel(tab: TabItem, index: number) {
    const selected = tab.id === this.value;
    return html`<section
      id=${panelId(this.id, index)}
      part="panel"
      role="tabpanel"
      tabindex="0"
      aria-labelledby=${tabId(this.id, index)}
      aria-hidden=${String(!selected)}
      ?hidden=${!selected}
      ?inert=${!selected}
    >
      <slot name=${panelSlot(index)}></slot>
    </section>`;
  }

  private readonly onTabClick = (event: Event): void => {
    const index = eventTabIndex(event);
    if (index === undefined) return;
    this.activeFocusIndex = index;
    this.commitTab(index);
  };

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (isCommitKey(event.key)) {
      event.preventDefault();
      this.commitTab(this.activeFocusIndex);
      return;
    }
    this.moveFocus(event);
  };

  private moveFocus(event: KeyboardEvent): void {
    const index = keyboardTabIndex(
      this.tabs,
      this.activeFocusIndex,
      event.key,
      this.orientation === StepperOrientation.Vertical
    );
    if (!shouldMoveFocus(index, this.activeFocusIndex)) return;
    event.preventDefault();
    this.activeFocusIndex = index;
    if (this.activationMode === TabActivationMode.Automatic) this.commitTab(index);
    void this.updateComplete.then(() => this.focusTab(index));
  }

  private commitTab(index: number): void {
    const tab = this.tabs[index];
    if (!selectable(tab, this.disabled, this.value)) return;
    this.value = tab.id;
    this.emitUiEvent(ElementEventType.ControlInput, { value: tab.id });
  }

  private readonly onFocusOut = (event: FocusEvent): void => {
    const container = event.currentTarget as HTMLElement;
    if (event.relatedTarget instanceof Node && container.contains(event.relatedTarget)) return;
    this.emitUiEvent(ElementEventType.ControlBlurred, { value: this.value });
  };

  private assignPanelSlots(): void {
    [...this.children].forEach((panel, index) => panel.setAttribute("slot", panelSlot(index)));
  }

  private focusTab(index: number): void {
    this.renderRoot.querySelector<HTMLElement>(`[data-tab-index="${index}"]`)?.focus();
  }
}

function eventTabIndex(event: Event): number | undefined {
  const button = (event.target as Element).closest<HTMLElement>("[data-tab-index]");
  if (button === null) return undefined;
  const value = Number(button.dataset["tabIndex"]);
  return Number.isInteger(value) ? value : undefined;
}

function navigationChanged(changed: PropertyValues): boolean {
  return changed.has("tabs") || changed.has("value");
}

function selectable(tab: TabItem | undefined, disabled: boolean, value: string): tab is TabItem {
  if (tab === undefined) return false;
  if (isTabDisabled(tab, disabled)) return false;
  return tab.id !== value;
}

function isTabDisabled(tab: TabItem, disabled: boolean): boolean {
  return disabled || tab.disabled === true;
}

function shouldMoveFocus(index: number | undefined, activeIndex: number): index is number {
  if (index === undefined) return false;
  if (index < 0) return false;
  return index !== activeIndex;
}

function previousTabId(tabs: readonly TabItem[] | undefined, index: number): string {
  if (tabs === undefined) return "";
  const tab = tabs[index];
  return tab === undefined ? "" : tab.id;
}

function isCommitKey(key: string): boolean {
  return key === "Enter" || key === " ";
}

function tabId(id: string, index: number): string {
  return `${id}__tab_${index}`;
}

function panelId(id: string, index: number): string {
  return `${id}__tabpanel_${index}`;
}

function panelSlot(index: number): string {
  return `panel-${index}`;
}
