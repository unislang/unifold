import { css, html, nothing, type PropertyDeclarations } from "lit";

import { hostDefaults } from "./styles.js";
import { UnifoldElement } from "./unifold-element.js";

/**
 * Hosts expanded composition children without introducing another state or event root.
 *
 * @tagname unifold-composition
 * @slot - Expanded composition children in deterministic order.
 * @csspart container - Optional accessible grouping container.
 */
export class UnifoldComposition extends UnifoldElement {
  static override properties: PropertyDeclarations = { label: {} };
  static override styles = [
    hostDefaults,
    css`
      :host {
        display: contents;
      }
    `
  ];

  declare label: string;

  constructor() {
    super();
    this.label = "";
  }

  protected override render() {
    const accessibleLabel = this.label === "" ? nothing : this.label;
    const role = this.label === "" ? nothing : "group";
    return html`
      <div part="container" role=${role} aria-label=${accessibleLabel}><slot></slot></div>
    `;
  }

  protected override eventProperties() {
    return { ...super.eventProperties(), label: this.label };
  }
}
