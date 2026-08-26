import { css, html, type PropertyDeclarations, type PropertyValues } from "lit";

import { hostDefaults } from "./styles.js";
import { UnifoldElement } from "./unifold-element.js";

/**
 * Groups related controls under one native legend and disabled-state boundary.
 *
 * @tagname unifold-fieldset
 * @slot - One to one hundred related controls or field structures.
 * @csspart container - Native fieldset container.
 */
export class UnifoldFieldset extends UnifoldElement {
  static override properties: PropertyDeclarations = {
    disabled: { reflect: true, type: Boolean },
    helpText: {},
    label: {}
  };
  static override styles = [
    hostDefaults,
    css`
      ::slotted(fieldset) {
        border: 1px solid var(--unifold-color-border, #6b7280);
        border-radius: var(--unifold-radius-md, 0.5rem);
        margin: 0;
        padding: var(--unifold-space-3, 0.75rem);
      }
    `
  ];

  declare disabled: boolean;
  declare helpText: string;
  declare label: string;
  private scaffold: FieldsetScaffold | undefined;

  constructor() {
    super();
    this.disabled = false;
    this.helpText = "";
    this.label = "";
  }

  /** @internal Renderer-owned mount surface that preserves native form ancestry. */
  get unifoldChildContainer(): HTMLElement {
    return this.requireScaffold().children;
  }

  protected override render() {
    return html`<slot></slot>`;
  }

  protected override updated(changed: PropertyValues): void {
    syncFieldsetScaffold(this, this.requireScaffold());
    super.updated(changed);
  }

  protected override eventProperties() {
    return {
      ...super.eventProperties(),
      disabled: this.disabled,
      helpText: this.helpText,
      label: this.label
    };
  }

  private requireScaffold(): FieldsetScaffold {
    if (this.scaffold !== undefined) return this.scaffold;
    const scaffold = createFieldsetScaffold(this.ownerDocument);
    this.append(scaffold.fieldset);
    this.scaffold = scaffold;
    return scaffold;
  }
}

interface FieldsetScaffold {
  readonly children: HTMLDivElement;
  readonly fieldset: HTMLFieldSetElement;
  readonly help: HTMLParagraphElement;
  readonly legend: HTMLLegendElement;
}

function createFieldsetScaffold(document: Document): FieldsetScaffold {
  const fieldset = document.createElement("fieldset");
  const legend = document.createElement("legend");
  const help = document.createElement("p");
  const children = document.createElement("div");
  fieldset.setAttribute("part", "container");
  children.dataset["unifoldFieldsetChildren"] = "";
  fieldset.append(legend, help, children);
  return { children, fieldset, help, legend };
}

function syncFieldsetScaffold(host: UnifoldFieldset, scaffold: FieldsetScaffold): void {
  const helpId = `${host.id}__fieldset-help`;
  scaffold.fieldset.disabled = host.disabled;
  scaffold.legend.textContent = host.label;
  scaffold.help.id = helpId;
  scaffold.help.textContent = host.helpText;
  scaffold.help.hidden = host.helpText === "";
  if (host.helpText === "") scaffold.fieldset.removeAttribute("aria-describedby");
  else scaffold.fieldset.setAttribute("aria-describedby", helpId);
}
