import { StepperOrientation, type WorkflowStep } from "@unislang/unifold-catalog";
import { UiUpdateTrigger, type JsonObject } from "@unislang/unifold-contracts";
import { css, html, nothing, type PropertyDeclarations, type PropertyValues } from "lit";

import { ElementEventType } from "./enums.js";
import { currentStepIndex, keyboardStepIndex, preferredStepIndex } from "./step-navigation.js";
import { focusRing, hostDefaults, validationStyles } from "./styles.js";
import { UnifoldElement } from "./unifold-element.js";

/**
 * Exposes and navigates one controlled ordered workflow progression.
 *
 * @tagname unifold-stepper
 * @fires unifold-event - Canonical step-selection and blur intents.
 * @csspart navigation - Labeled workflow navigation landmark.
 * @csspart step - One native step button.
 */
export class UnifoldStepper extends UnifoldElement {
  static override properties: PropertyDeclarations = {
    activeFocusIndex: { state: true },
    asyncValidators: { attribute: false },
    disabled: { reflect: true, type: Boolean },
    errorMessage: { attribute: "error-message" },
    label: {},
    name: {},
    orientation: { reflect: true },
    steps: { attribute: false },
    updateOn: { attribute: "update-on" },
    validators: { attribute: false },
    value: {}
  };

  static override styles = [
    hostDefaults,
    focusRing,
    validationStyles,
    css`
      :host {
        display: block;
      }
      ol {
        display: flex;
        gap: var(--unifold-space-3, 0.75rem);
        list-style: none;
        margin: 0;
        overflow: auto;
        padding: 0;
      }
      :host([orientation="vertical"]) ol {
        flex-direction: column;
      }
      li {
        min-inline-size: 0;
      }
      [part="step"] {
        align-items: start;
        background: transparent;
        border: 0;
        color: inherit;
        display: grid;
        font: inherit;
        gap: var(--unifold-space-1, 0.25rem);
        grid-template-columns: auto minmax(0, 1fr);
        padding: var(--unifold-space-2, 0.5rem);
        text-align: start;
      }
      [part="step"][aria-current="step"] {
        font-weight: 700;
      }
      [part="number"] {
        align-items: center;
        border: 1px solid currentcolor;
        border-radius: 999px;
        display: inline-flex;
        block-size: 1.75rem;
        inline-size: 1.75rem;
        justify-content: center;
      }
      [part="description"] {
        color: var(--unifold-color-text-muted, #4b5563);
        font-size: 0.875em;
        grid-column: 2;
      }
    `
  ];

  declare activeFocusIndex: number;
  declare asyncValidators: readonly string[];
  declare disabled: boolean;
  declare errorMessage: string;
  declare label: string;
  declare name: string;
  declare orientation: StepperOrientation;
  declare steps: readonly WorkflowStep[];
  declare updateOn: UiUpdateTrigger;
  declare validators: readonly string[];
  declare value: string;

  constructor() {
    super();
    this.activeFocusIndex = 0;
    this.asyncValidators = [];
    this.disabled = false;
    this.errorMessage = "";
    this.label = "";
    this.name = "";
    this.orientation = StepperOrientation.Horizontal;
    this.steps = [];
    this.updateOn = UiUpdateTrigger.Input;
    this.validators = [];
    this.value = "";
  }

  protected override willUpdate(changed: PropertyValues): void {
    if (!navigationChanged(changed)) return;
    const previous = changed.get("steps") as readonly WorkflowStep[] | undefined;
    const previousId = previousStepId(previous, this.activeFocusIndex);
    this.activeFocusIndex = preferredStepIndex(this.steps, this.value, previousId);
  }

  protected override render() {
    return html`<div @focusout=${this.onFocusOut}>
      ${this.renderNavigation()}${this.renderError()}
    </div>`;
  }

  protected renderNavigation() {
    return html`<nav
      part="navigation"
      aria-label=${this.label}
      @click=${this.onStepClick}
      @keydown=${this.onKeyDown}
    >
      <ol>
        ${this.steps.map((step, index) => this.renderStep(step, index))}
      </ol>
    </nav>`;
  }

  protected renderError() {
    return html`<span id=${`${this.id}-error`} role="alert">${this.errorMessage}</span>`;
  }

  protected renderStep(step: WorkflowStep, index: number) {
    const current = index === this.selectedIndex();
    const descriptionId = `${this.id}__step_description_${index}`;
    return html`<li>
      <button
        id=${stepButtonId(this.id, index)}
        part="step"
        type="button"
        data-step-index=${String(index)}
        tabindex=${tabIndex(index, this.activeFocusIndex)}
        ?disabled=${this.stepUnavailable(index)}
        aria-current=${currentStepAttribute(current)}
        aria-describedby=${descriptionAttribute(step, descriptionId)}
      >
        <span part="number" aria-hidden="true">${index + 1}</span>
        <span part="label">${step.label}</span>
        ${renderDescription(step, descriptionId)}
      </button>
    </li>`;
  }

  protected override eventProperties(): JsonObject {
    return {
      asyncValidators: this.asyncValidators,
      disabled: this.disabled,
      errorMessage: this.errorMessage,
      label: this.label,
      name: this.name,
      orientation: this.orientation,
      steps: this.steps,
      updateOn: this.updateOn,
      validators: this.validators,
      value: this.value
    };
  }

  protected override eventValue() {
    return this.value;
  }

  protected selectedIndex(): number {
    return currentStepIndex(this.steps, this.value);
  }

  protected stepUnavailable(index: number): boolean {
    return this.disabled || this.steps[index]?.disabled === true;
  }

  protected commitStep(index: number, force = false): void {
    const step = committedStep(
      this.steps[index],
      this.disabled,
      this.value,
      force,
      this.stepUnavailable(index)
    );
    if (step === undefined) return;
    this.activeFocusIndex = index;
    this.value = step.id;
    this.emitUiEvent(ElementEventType.ControlInput, { value: this.value });
  }

  private readonly onStepClick = (event: Event): void => {
    const index = eventStepIndex(event);
    if (index !== undefined) this.commitStep(index);
  };

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (isCommitKey(event.key)) {
      event.preventDefault();
      this.commitStep(this.activeFocusIndex);
      return;
    }
    const index = keyboardStepIndex(
      this.steps,
      this.activeFocusIndex,
      event.key,
      this.orientation === StepperOrientation.Vertical
    );
    if (!isDifferentIndex(index, this.activeFocusIndex)) return;
    event.preventDefault();
    this.activeFocusIndex = index;
    void this.updateComplete.then(() => this.focusStep(index));
  };

  protected readonly onFocusOut = (event: FocusEvent): void => {
    const container = event.currentTarget as HTMLElement;
    if (event.relatedTarget instanceof Node && container.contains(event.relatedTarget)) return;
    this.emitUiEvent(ElementEventType.ControlBlurred, { value: this.value });
  };

  private focusStep(index: number): void {
    this.shadowRoot?.querySelector<HTMLButtonElement>(`[data-step-index="${index}"]`)?.focus();
  }
}

function eventStepIndex(event: Event): number | undefined {
  const button = (event.target as Element).closest<HTMLElement>("[data-step-index]");
  if (button === null) return undefined;
  const value = Number(button.dataset["stepIndex"]);
  return Number.isInteger(value) ? value : undefined;
}

export function stepButtonId(id: string, index: number): string {
  return `${id}__step_${index}`;
}

function navigationChanged(changed: PropertyValues): boolean {
  return changed.has("steps") || changed.has("value");
}

function tabIndex(index: number, activeIndex: number): string {
  return index === activeIndex ? "0" : "-1";
}

function currentStepAttribute(current: boolean): "step" | typeof nothing {
  return current ? "step" : nothing;
}

function descriptionAttribute(step: WorkflowStep, id: string): string | typeof nothing {
  return step.description === undefined ? nothing : id;
}

function renderDescription(step: WorkflowStep, id: string) {
  return step.description === undefined
    ? nothing
    : html`<span id=${id} part="description">${step.description}</span>`;
}

function selectableStep(
  step: WorkflowStep | undefined,
  disabled: boolean,
  value: string
): WorkflowStep | undefined {
  if (step === undefined) return undefined;
  const selectable = [!disabled, step.disabled !== true, step.id !== value];
  return selectable.every(Boolean) ? step : undefined;
}

function commitAllowed(force: boolean, unavailable: boolean): boolean {
  return force || !unavailable;
}

function committedStep(
  step: WorkflowStep | undefined,
  disabled: boolean,
  value: string,
  force: boolean,
  unavailable: boolean
): WorkflowStep | undefined {
  const candidate = selectableStep(step, disabled, value);
  return commitAllowed(force, unavailable) ? candidate : undefined;
}

function previousStepId(steps: readonly WorkflowStep[] | undefined, index: number): string {
  return stepIdValue(steps?.[index]);
}

function stepIdValue(step: WorkflowStep | undefined): string {
  return step?.id ?? "";
}

function isCommitKey(key: string): boolean {
  return key === "Enter" || key === " ";
}

function isDifferentIndex(index: number | undefined, activeIndex: number): index is number {
  return index !== undefined && index !== activeIndex;
}
