import { ButtonAction } from "@unislang/unifold-catalog";
import type { JsonValue } from "@unislang/unifold-contracts";
import type { UiEvent } from "@unislang/unifold-events";
import { css, type PropertyDeclarations, type PropertyValues } from "lit";

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
      [data-unifold-form-children] {
        display: grid;
        gap: var(--unifold-space-4, 1rem);
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
  private readonly childContainer: HTMLDivElement;
  private readonly errorSummary: HTMLDivElement;
  private readonly legend: HTMLLegendElement;
  private readonly nativeForm: HTMLFormElement;

  constructor() {
    super();
    const scaffold = createFormScaffold(this.ownerDocument);
    this.childContainer = scaffold.childContainer;
    this.errorSummary = scaffold.errorSummary;
    this.legend = scaffold.legend;
    this.nativeForm = scaffold.form;
    this.nativeForm.addEventListener("reset", this.onNativeReset);
    this.nativeForm.addEventListener("submit", this.onNativeSubmit);
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
    this.syncScaffold();
    return this.nativeForm;
  }

  /** @internal Renderer-owned mount surface that preserves native form ancestry. */
  get unifoldChildContainer(): HTMLElement {
    return this.nativeForm.isConnected ? this.childContainer : this;
  }

  protected override updated(changed: PropertyValues): void {
    this.adoptLightDomChildren();
    super.updated(changed);
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

  private adoptLightDomChildren(): void {
    while (this.firstChild !== null) this.childContainer.append(this.firstChild);
  }

  private syncScaffold(): void {
    this.nativeForm.setAttribute("aria-label", this.label);
    this.legend.textContent = this.label;
    syncErrors(this.errorSummary, this.errorMessages);
  }
}

interface FormScaffold {
  readonly childContainer: HTMLDivElement;
  readonly errorSummary: HTMLDivElement;
  readonly form: HTMLFormElement;
  readonly legend: HTMLLegendElement;
}

function createFormScaffold(document: Document): FormScaffold {
  const form = document.createElement("form");
  const fieldset = document.createElement("fieldset");
  const legend = document.createElement("legend");
  const errorSummary = document.createElement("div");
  const childContainer = document.createElement("div");
  childContainer.dataset["unifoldFormChildren"] = "";
  fieldset.append(legend, errorSummary, childContainer);
  form.append(fieldset);
  return { childContainer, errorSummary, form, legend };
}

function syncErrors(container: HTMLDivElement, messages: readonly string[]): void {
  container.replaceChildren();
  container.removeAttribute("role");
  if (messages.length === 0) return;
  container.setAttribute("role", "alert");
  const lead = container.ownerDocument.createElement("p");
  lead.textContent = "Please correct the following errors:";
  const list = container.ownerDocument.createElement("ul");
  messages.forEach((message) => list.append(errorItem(container.ownerDocument, message)));
  container.append(lead, list);
}

function errorItem(document: Document, message: string): HTMLLIElement {
  const item = document.createElement("li");
  item.textContent = message;
  return item;
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
