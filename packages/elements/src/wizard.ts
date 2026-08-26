import { type JsonObject } from "@unislang/unifold-contracts";
import { css, html, type PropertyDeclarations, type PropertyValues } from "lit";

import { ElementEventType } from "./enums.js";
import { boundaryStepIndex, nextEnabledStepIndex } from "./step-navigation.js";
import { stepButtonId, UnifoldStepper } from "./stepper.js";

/**
 * Navigates one controlled sequence of stable authored child panels.
 *
 * @tagname unifold-wizard
 * @slot - One authored child panel for each declared step, in matching order.
 * @fires unifold-event - Canonical navigation, blur, and completion intents.
 * @csspart panel - Current step's labeled content region.
 * @csspart actions - Back, Next, and Complete actions.
 */
export class UnifoldWizard extends UnifoldStepper {
  static override properties: PropertyDeclarations = {
    backLabel: { attribute: "back-label" },
    completeLabel: { attribute: "complete-label" },
    linear: { reflect: true, type: Boolean },
    nextLabel: { attribute: "next-label" }
  };

  static override styles = [
    ...UnifoldStepper.styles,
    css`
      [part="panel"] {
        border: 1px solid var(--unifold-color-border, #d1d5db);
        border-radius: var(--unifold-radius-md, 0.375rem);
        margin-block: var(--unifold-space-4, 1rem);
        min-block-size: 4rem;
        padding: var(--unifold-space-4, 1rem);
      }
      [part="actions"] {
        display: flex;
        gap: var(--unifold-space-2, 0.5rem);
        justify-content: space-between;
      }
      [part="actions"] button {
        border: 1px solid var(--unifold-color-border, #6b7280);
        border-radius: var(--unifold-radius-md, 0.375rem);
        font: inherit;
        min-block-size: var(--unifold-control-min-height, 2.75rem);
        padding-inline: var(--unifold-space-4, 1rem);
      }
    `
  ];

  declare backLabel: string;
  declare completeLabel: string;
  declare linear: boolean;
  declare nextLabel: string;

  constructor() {
    super();
    this.backLabel = "Back";
    this.completeLabel = "Complete";
    this.linear = true;
    this.nextLabel = "Next";
  }

  protected override render() {
    const selected = this.selectedIndex();
    return html`<div @focusout=${this.onFocusOut}>
      ${this.renderNavigation()}
      <section
        id=${`${this.id}__panel`}
        part="panel"
        role="region"
        tabindex="-1"
        aria-labelledby=${stepButtonId(this.id, selected)}
      >
        <slot @slotchange=${this.synchronizePanels}></slot>
      </section>
      ${this.renderActions(selected)}${this.renderError()}
    </div>`;
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed);
    this.synchronizePanels();
  }

  protected override eventProperties(): JsonObject {
    return {
      ...super.eventProperties(),
      backLabel: this.backLabel,
      completeLabel: this.completeLabel,
      linear: this.linear,
      nextLabel: this.nextLabel
    };
  }

  protected override stepUnavailable(index: number): boolean {
    if (super.stepUnavailable(index)) return true;
    return this.linear && index > this.selectedIndex();
  }

  protected override commitStep(index: number, force = false): void {
    const previous = this.value;
    super.commitStep(index, force);
    if (previous !== this.value) void this.updateComplete.then(() => this.focusPanel());
  }

  private renderActions(selected: number) {
    const previous = nextEnabledStepIndex(this.steps, selected, -1);
    const next = nextEnabledStepIndex(this.steps, selected, 1);
    const last = boundaryStepIndex(this.steps, "last");
    return html`<div part="actions">
      <button
        part="back"
        type="button"
        ?disabled=${this.disabled || previous === selected}
        @click=${this.goBack}
      >
        ${this.backLabel}
      </button>
      ${this.renderForwardAction(selected, last, next)}
    </div>`;
  }

  private renderForwardAction(selected: number, last: number, next: number) {
    if (selected === last) {
      return html`<button
        part="complete"
        type="button"
        ?disabled=${this.disabled}
        @click=${this.complete}
      >
        ${this.completeLabel}
      </button>`;
    }
    return html`<button
      part="next"
      type="button"
      ?disabled=${this.disabled || next === selected}
      @click=${this.goNext}
    >
      ${this.nextLabel}
    </button>`;
  }

  private readonly goBack = (): void => {
    this.advance(-1);
  };

  private readonly goNext = (): void => {
    this.advance(1);
  };

  private advance(direction: -1 | 1): void {
    if (this.disabled) return;
    const current = this.selectedIndex();
    const next = nextEnabledStepIndex(this.steps, current, direction);
    if (next !== current) this.commitStep(next, true);
  }

  private readonly complete = (): void => {
    if (this.disabled || this.selectedIndex() !== boundaryStepIndex(this.steps, "last")) return;
    this.emitUiEvent(ElementEventType.ComponentActivated, {
      action: "complete",
      value: this.value
    });
  };

  private readonly synchronizePanels = (): void => {
    const slot = this.renderRoot.querySelector<HTMLSlotElement>("slot");
    if (!(slot instanceof HTMLSlotElement)) return;
    const selected = this.selectedIndex();
    slot.assignedElements().forEach((panel, index) => setPanelActive(panel, index === selected));
  };

  private focusPanel(): void {
    this.shadowRoot?.querySelector<HTMLElement>("[part=panel]")?.focus();
  }
}

function setPanelActive(panel: Element, active: boolean): void {
  panel.toggleAttribute("hidden", !active);
  panel.toggleAttribute("inert", !active);
  panel.setAttribute("aria-hidden", String(!active));
}
