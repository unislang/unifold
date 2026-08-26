import { buildLucideIconElement } from "@lucide/icons/build";
import { IconName, IconSize, IconTone } from "@unislang/unifold-catalog";
import { css, type PropertyDeclarations } from "lit";

import { getCoreIcon } from "./icon-registry.js";
import { hostDefaults } from "./styles.js";
import { UnifoldElement } from "./unifold-element.js";

/**
 * Renders an allowlisted local SVG as decorative or accessibly named content.
 *
 * @tagname unifold-icon
 * @csspart icon - Generated SVG element.
 * @cssprop --unifold-color-muted - Muted icon color.
 * @cssprop --unifold-color-primary - Primary icon color.
 * @cssprop --unifold-color-success - Success icon color.
 * @cssprop --unifold-color-warning - Warning icon color.
 * @cssprop --unifold-color-danger - Danger icon color.
 */
export class UnifoldIcon extends UnifoldElement {
  static override properties: PropertyDeclarations = {
    label: {},
    name: { reflect: true },
    size: { reflect: true },
    tone: { reflect: true }
  };

  static override styles = [
    hostDefaults,
    css`
      :host {
        display: inline-flex;
        line-height: 0;
        vertical-align: middle;
      }
      svg {
        block-size: 1.25rem;
        inline-size: 1.25rem;
      }
      :host([size="sm"]) svg {
        block-size: 1rem;
        inline-size: 1rem;
      }
      :host([size="lg"]) svg {
        block-size: 1.5rem;
        inline-size: 1.5rem;
      }
      :host([tone="muted"]) {
        color: var(--unifold-color-muted, #4b5563);
      }
      :host([tone="primary"]) {
        color: var(--unifold-color-primary, #1d4ed8);
      }
      :host([tone="success"]) {
        color: var(--unifold-color-success, #047857);
      }
      :host([tone="warning"]) {
        color: var(--unifold-color-warning, #a16207);
      }
      :host([tone="danger"]) {
        color: var(--unifold-color-danger, #b91c1c);
      }
    `
  ];

  declare label: string;
  declare name: IconName;
  declare size: IconSize;
  declare tone: IconTone;

  constructor() {
    super();
    this.label = "";
    this.name = IconName.Info;
    this.size = IconSize.Medium;
    this.tone = IconTone.Default;
  }

  protected override render(): Element {
    const svg = buildLucideIconElement(this.ownerDocument, getCoreIcon(this.name));
    configureAccessibility(svg, this.label);
    return svg;
  }

  protected override eventProperties() {
    return {
      ...super.eventProperties(),
      label: this.label,
      name: this.name,
      size: this.size,
      tone: this.tone
    };
  }
}

function configureAccessibility(svg: Element, label: string): void {
  svg.setAttribute("focusable", "false");
  svg.setAttribute("part", "icon");
  if (label === "") {
    svg.setAttribute("aria-hidden", "true");
    return;
  }
  svg.setAttribute("aria-label", label);
  svg.setAttribute("role", "img");
}
