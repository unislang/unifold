import { LayoutSpace, SurfaceTone } from "@unislang/unifold-catalog";
import { css, html, type PropertyDeclarations } from "lit";

import { UnifoldLayoutElement } from "./layout-element.js";
import { hostDefaults } from "./styles.js";

/**
 * Groups one independently meaningful bounded content item as a native article.
 *
 * @tagname unifold-card
 * @slot - Card content in authored DOM order.
 * @csspart article - Native article surface.
 * @cssprop --unifold-radius-md - Card corner radius.
 * @cssprop --unifold-color-border - Card border color.
 * @cssprop --unifold-color-surface - Default card surface.
 * @cssprop --unifold-color-surface-subtle - Subtle card surface.
 */
export class UnifoldCard extends UnifoldLayoutElement {
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
      article {
        border: 1px solid var(--unifold-color-border, #d1d5db);
        border-radius: var(--unifold-radius-md, 0.5rem);
      }
      :host([padding="none"]) article {
        padding: 0;
      }
      :host([padding="sm"]) article {
        padding: var(--unifold-space-1, 0.25rem);
      }
      :host([padding="md"]) article {
        padding: var(--unifold-space-2, 0.5rem);
      }
      :host([padding="lg"]) article {
        padding: var(--unifold-space-3, 0.75rem);
      }
      :host([padding="xl"]) article {
        padding: var(--unifold-space-4, 1rem);
      }
      :host([surface="default"]) article {
        background: var(--unifold-color-surface, #ffffff);
      }
      :host([surface="subtle"]) article {
        background: var(--unifold-color-surface-subtle, #f3f4f6);
      }
      :host([surface="transparent"]) article {
        background: transparent;
      }
    `
  ];

  declare padding: LayoutSpace;
  declare surface: SurfaceTone;

  constructor() {
    super();
    this.padding = LayoutSpace.Medium;
    this.surface = SurfaceTone.Default;
  }

  protected override render() {
    return html`<article part="article" aria-label=${this.groupLabel()}><slot></slot></article>`;
  }

  protected override eventProperties() {
    return { ...super.eventProperties(), padding: this.padding, surface: this.surface };
  }
}
