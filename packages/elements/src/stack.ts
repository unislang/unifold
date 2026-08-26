import { LayoutAlignment, LayoutSpace, StackDirection } from "@unislang/unifold-catalog";
import { css, html, type PropertyDeclarations } from "lit";

import { UnifoldLayoutElement } from "./layout-element.js";
import { hostDefaults, layoutGapStyles } from "./styles.js";

/**
 * Arranges slotted children linearly with token-backed direction, alignment, and spacing.
 *
 * @tagname unifold-stack
 * @slot - Stack children in authored DOM order.
 * @csspart container - Flex layout container.
 */
export class UnifoldStack extends UnifoldLayoutElement {
  static override properties: PropertyDeclarations = {
    align: { reflect: true },
    direction: { reflect: true },
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
        display: flex;
      }
      :host([direction="horizontal"]) [part="container"] {
        flex-direction: row;
      }
      :host([direction="vertical"]) [part="container"] {
        flex-direction: column;
      }
      :host([align="start"]) [part="container"] {
        align-items: flex-start;
      }
      :host([align="center"]) [part="container"] {
        align-items: center;
      }
      :host([align="end"]) [part="container"] {
        align-items: flex-end;
      }
      :host([align="stretch"]) [part="container"] {
        align-items: stretch;
      }
    `
  ];

  declare align: LayoutAlignment;
  declare direction: StackDirection;
  declare gap: LayoutSpace;

  constructor() {
    super();
    this.align = LayoutAlignment.Stretch;
    this.direction = StackDirection.Vertical;
    this.gap = LayoutSpace.Medium;
  }

  protected override render() {
    return html`
      <div part="container" role=${this.groupRole()} aria-label=${this.groupLabel()}>
        <slot></slot>
      </div>
    `;
  }

  protected override eventProperties() {
    return {
      ...super.eventProperties(),
      align: this.align,
      direction: this.direction,
      gap: this.gap
    };
  }
}
