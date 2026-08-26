import { LayoutSpace, SurfaceTone } from "@unislang/unifold-catalog";
import { css, html, type PropertyDeclarations } from "lit";

import { UnifoldLayoutElement } from "./layout-element.js";
import { hostDefaults } from "./styles.js";

/**
 * Groups slotted children in a token-backed padded surface.
 *
 * @tagname unifold-box
 * @slot - Box children in authored DOM order.
 * @csspart container - Styled grouping container.
 * @cssprop --unifold-radius-md - Surface corner radius.
 * @cssprop --unifold-space-1 - Small padding.
 * @cssprop --unifold-space-2 - Medium padding.
 * @cssprop --unifold-space-3 - Large padding.
 * @cssprop --unifold-space-4 - Extra-large padding.
 * @cssprop --unifold-color-surface - Default surface color.
 * @cssprop --unifold-color-surface-subtle - Subtle surface color.
 */
export class UnifoldBox extends UnifoldLayoutElement {
  static override properties: PropertyDeclarations = {
    padding: { reflect: true },
    surface: { reflect: true }
  };

  static override styles = [
    hostDefaults,
    css`
      :host {
        display: block;
      }
      [part="container"] {
        border-radius: var(--unifold-radius-md, 0.5rem);
      }
      :host([padding="none"]) [part="container"] {
        padding: 0;
      }
      :host([padding="sm"]) [part="container"] {
        padding: var(--unifold-space-1, 0.25rem);
      }
      :host([padding="md"]) [part="container"] {
        padding: var(--unifold-space-2, 0.5rem);
      }
      :host([padding="lg"]) [part="container"] {
        padding: var(--unifold-space-3, 0.75rem);
      }
      :host([padding="xl"]) [part="container"] {
        padding: var(--unifold-space-4, 1rem);
      }
      :host([surface="default"]) [part="container"] {
        background: var(--unifold-color-surface, #ffffff);
      }
      :host([surface="subtle"]) [part="container"] {
        background: var(--unifold-color-surface-subtle, #f3f4f6);
      }
      :host([surface="transparent"]) [part="container"] {
        background: transparent;
      }
    `
  ];

  declare padding: LayoutSpace;
  declare surface: SurfaceTone;

  constructor() {
    super();
    this.padding = LayoutSpace.Medium;
    this.surface = SurfaceTone.Transparent;
  }

  protected override render() {
    return html`
      <div part="container" role=${this.groupRole()} aria-label=${this.groupLabel()}>
        <slot></slot>
      </div>
    `;
  }

  protected override eventProperties() {
    return { ...super.eventProperties(), padding: this.padding, surface: this.surface };
  }
}
