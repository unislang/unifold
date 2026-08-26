import { css, html, type PropertyDeclarations, type PropertyValues } from "lit";

import { hostDefaults } from "./styles.js";
import { UnifoldElement } from "./unifold-element.js";

/**
 * Groups one independently labeled control with ordered help and validation context.
 *
 * @tagname unifold-field
 * @slot - Exactly one JSON-authored control.
 * @csspart container - Accessible field group.
 */
export class UnifoldField extends UnifoldElement {
  static override properties: PropertyDeclarations = {
    errorMessage: {},
    helpText: {},
    label: {},
    required: { reflect: true, type: Boolean }
  };
  static override styles = [
    hostDefaults,
    css`
      ::slotted([data-unifold-field]) {
        display: grid;
        gap: var(--unifold-space-1, 0.25rem);
      }
    `
  ];

  declare errorMessage: string;
  declare helpText: string;
  declare label: string;
  declare required: boolean;
  private scaffold: FieldScaffold | undefined;

  constructor() {
    super();
    this.errorMessage = "";
    this.helpText = "";
    this.label = "";
    this.required = false;
  }

  /** @internal Renderer-owned mount surface that preserves native form ancestry. */
  get unifoldChildContainer(): HTMLElement {
    return this.requireScaffold().children;
  }

  protected override render() {
    return html`<slot></slot>`;
  }

  protected override updated(changed: PropertyValues): void {
    syncFieldScaffold(this, this.requireScaffold());
    super.updated(changed);
  }

  protected override eventProperties() {
    return {
      ...super.eventProperties(),
      errorMessage: this.errorMessage,
      helpText: this.helpText,
      label: this.label,
      required: this.required
    };
  }

  private requireScaffold(): FieldScaffold {
    if (this.scaffold !== undefined) return this.scaffold;
    const scaffold = createFieldScaffold(this.ownerDocument);
    this.append(scaffold.container);
    this.scaffold = scaffold;
    return scaffold;
  }
}

interface FieldScaffold {
  readonly children: HTMLDivElement;
  readonly container: HTMLDivElement;
  readonly error: HTMLParagraphElement;
  readonly help: HTMLParagraphElement;
  readonly label: HTMLSpanElement;
}

function createFieldScaffold(document: Document): FieldScaffold {
  const container = document.createElement("div");
  const label = document.createElement("span");
  const help = document.createElement("p");
  const children = document.createElement("div");
  const error = document.createElement("p");
  container.dataset["unifoldField"] = "";
  container.setAttribute("part", "container");
  container.setAttribute("role", "group");
  children.dataset["unifoldFieldChildren"] = "";
  error.setAttribute("role", "alert");
  container.append(label, help, children, error);
  return { children, container, error, help, label };
}

function syncFieldScaffold(host: UnifoldField, scaffold: FieldScaffold): void {
  const labelId = `${host.id}__field-label`;
  const helpId = `${host.id}__field-help`;
  const errorId = `${host.id}__field-error`;
  syncText(scaffold.label, requiredLabel(host), labelId);
  syncText(scaffold.help, host.helpText, helpId);
  syncText(scaffold.error, host.errorMessage, errorId);
  syncReference(scaffold.container, "aria-labelledby", host.label, labelId);
  const descriptions = descriptionIds(host, helpId, errorId);
  syncReference(scaffold.container, "aria-describedby", descriptions, descriptions);
}

function requiredLabel(host: UnifoldField): string {
  return host.required ? `${host.label} (required)` : host.label;
}

function descriptionIds(host: UnifoldField, helpId: string, errorId: string): string {
  return [host.helpText === "" ? "" : helpId, host.errorMessage === "" ? "" : errorId]
    .filter(Boolean)
    .join(" ");
}

function syncText(element: HTMLElement, value: string, id: string): void {
  element.id = id;
  element.textContent = value;
  element.hidden = value === "";
}

function syncReference(element: HTMLElement, name: string, value: string, reference: string): void {
  if (value === "") element.removeAttribute(name);
  else element.setAttribute(name, reference);
}
