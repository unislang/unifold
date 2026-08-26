import { ButtonAction } from "@unislang/unifold-catalog";
import type { JsonValue } from "@unislang/unifold-contracts";
import type { UiEvent } from "@unislang/unifold-events";
import { css, html, type PropertyDeclarations } from "lit";

import { ElementEventName, ElementEventType } from "./enums.js";
import { hostDefaults, validationStyles } from "./styles.js";
import { isJsonObject, UnifoldElement } from "./unifold-element.js";

/**
 * Coordinates descendant controls through a native form and one canonical stream.
 *
 * @tagname unifold-form
 * @slot - Form controls and actions in authored order.
 * @fires unifold-event - Canonical submit and reset request intents.
 * @cssprop --unifold-space-4 - Form control spacing.
 * @cssprop --unifold-space-2 - Legend spacing.
 */
export class UnifoldForm extends UnifoldElement {
  static override properties: PropertyDeclarations = {
    asyncValidators: { attribute: false },
    errorMessages: { attribute: false },
    label: {},
    validators: { attribute: false }
  };
  static override styles = [
    hostDefaults,
    validationStyles,
    css`
      form {
        display: grid;
        gap: var(--unifold-space-4, 1rem);
      }
      fieldset {
        border: 0;
        display: contents;
        margin: 0;
        padding: 0;
      }
      legend {
        font-size: 1.25rem;
        font-weight: 700;
        margin-block-end: var(--unifold-space-2, 0.5rem);
      }
    `
  ];

  declare asyncValidators: readonly string[];
  declare label: string;
  declare errorMessages: readonly string[];
  declare validators: readonly string[];

  constructor() {
    super();
    this.asyncValidators = [];
    this.errorMessages = [];
    this.label = "";
    this.validators = [];
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.addEventListener(ElementEventName.UiEvent, this.onUiEvent);
  }

  override disconnectedCallback(): void {
    this.removeEventListener(ElementEventName.UiEvent, this.onUiEvent);
    super.disconnectedCallback();
  }

  protected override render() {
    return html`
      <form aria-label=${this.label} @reset=${this.onNativeReset} @submit=${this.onNativeSubmit}>
        <fieldset>
          <legend>${this.label}</legend>
          ${this.errorMessages.length === 0
            ? undefined
            : html`<div role="alert">
                <p>Please correct the following errors:</p>
                <ul>
                  ${this.errorMessages.map((message) => html`<li>${message}</li>`)}
                </ul>
              </div>`}
          <slot></slot>
        </fieldset>
      </form>
    `;
  }

  protected override eventProperties() {
    return {
      ...super.eventProperties(),
      asyncValidators: this.asyncValidators,
      errorMessages: this.errorMessages,
      label: this.label,
      validators: this.validators
    };
  }

  private readonly onUiEvent = (event: Event): void => {
    const uiEvent = (event as CustomEvent<UiEvent>).detail;
    if (isSubmitActivation(uiEvent)) queueMicrotask(() => this.requestSubmit());
    if (isResetActivation(uiEvent)) queueMicrotask(() => this.requestReset());
  };

  private readonly onNativeReset = (event: Event): void => {
    event.preventDefault();
    this.requestReset();
  };

  private readonly onNativeSubmit = (event: SubmitEvent): void => {
    event.preventDefault();
    this.requestSubmit();
  };

  private requestSubmit(): void {
    this.requestFormAction(ElementEventType.FormSubmitRequested);
  }

  private requestReset(): void {
    this.requestFormAction(ElementEventType.FormResetRequested);
  }

  private requestFormAction(
    type: ElementEventType.FormResetRequested | ElementEventType.FormSubmitRequested
  ): void {
    const revision = this.eventNode?.revision;
    if (revision === undefined) throw new Error("Form event metadata is not configured.");
    this.emitUiEvent(type, { revision });
  }
}

function isSubmitActivation(event: UiEvent): boolean {
  if (event.type !== ElementEventType.ComponentActivated) return false;
  return readChange(event, "action") === ButtonAction.Submit;
}

function isResetActivation(event: UiEvent): boolean {
  if (event.type !== ElementEventType.ComponentActivated) return false;
  return readChange(event, "action") === ButtonAction.Reset;
}

function readChange(event: UiEvent, key: string): JsonValue | undefined {
  const change = event.data.change;
  return isJsonObject(change) ? change[key] : undefined;
}
