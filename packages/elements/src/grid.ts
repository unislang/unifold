import { LayoutSpace } from "@unislang/unifold-catalog";
import { css, html, type PropertyDeclarations } from "lit";
import { styleMap } from "lit/directives/style-map.js";

import { UnifoldLayoutElement } from "./layout-element.js";
import { hostDefaults, layoutGapStyles } from "./styles.js";

/**
 * Arranges slotted children in a token-spaced responsive grid.
 *
 * @tagname unifold-grid
 * @slot - Grid children in authored DOM order.
 * @csspart container - Grid layout container.
 * @cssprop --unifold-grid-columns - Computed grid column count.
 */
export class UnifoldGrid extends UnifoldLayoutElement {
  static override properties: PropertyDeclarations = {
    columns: { type: Number },
    gap: { reflect: true }
  };

  static override styles = [
    hostDefaults,
    layoutGapStyles,
    css`
      :host {
        display: block;
      }
      [part="container"] {
        display: grid;
        grid-template-columns: repeat(var(--unifold-grid-columns), minmax(0, 1fr));
      }
    `
  ];

  declare columns: number;
  declare gap: LayoutSpace;

  constructor() {
    super();
    this.columns = 1;
    this.gap = LayoutSpace.Medium;
  }

  protected override render() {
    const styles = { "--unifold-grid-columns": String(this.columns) };
    return html`
      <div
        part="container"
        role=${this.groupRole()}
        aria-label=${this.groupLabel()}
        style=${styleMap(styles)}
      >
        <slot></slot>
      </div>
    `;
  }

  protected override eventProperties() {
    return { ...super.eventProperties(), columns: this.columns, gap: this.gap };
  }
}
