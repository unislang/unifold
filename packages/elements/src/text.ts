import { TextSize, TextTone, TextWeight } from "@unislang/unifold-catalog";
import { css, html, type PropertyDeclarations } from "lit";

import { hostDefaults } from "./styles.js";
import { UnifoldElement } from "./unifold-element.js";

/**
 * Renders one escaped paragraph with token-backed typography.
 *
 * @tagname unifold-text
 * @csspart text - Native paragraph element.
 * @cssprop --unifold-color-muted - Muted text color.
 * @cssprop --unifold-color-danger - Danger text color.
 */
export class UnifoldText extends UnifoldElement {
  static override properties: PropertyDeclarations = {
    content: {},
    size: { reflect: true },
    tone: { reflect: true },
    weight: { reflect: true }
  };

  static override styles = [
    hostDefaults,
    css`
      p {
        margin: 0;
      }
      :host([size="sm"]) p {
        font-size: 0.875rem;
      }
      :host([size="md"]) p {
        font-size: 1rem;
      }
      :host([size="lg"]) p {
        font-size: 1.125rem;
      }
      :host([tone="muted"]) p {
        color: var(--unifold-color-muted, #4b5563);
      }
      :host([tone="danger"]) p {
        color: var(--unifold-color-danger, #b91c1c);
      }
      :host([weight="medium"]) p {
        font-weight: 500;
      }
      :host([weight="semibold"]) p {
        font-weight: 600;
      }
      :host([weight="bold"]) p {
        font-weight: 700;
      }
    `
  ];

  declare content: string;
  declare size: TextSize;
  declare tone: TextTone;
  declare weight: TextWeight;

  constructor() {
    super();
    this.content = "";
    this.size = TextSize.Medium;
    this.tone = TextTone.Default;
    this.weight = TextWeight.Normal;
  }

  protected override render() {
    return html`<p part="text">${this.content}</p>`;
  }

  protected override eventProperties() {
    return {
      ...super.eventProperties(),
      content: this.content,
      size: this.size,
      tone: this.tone,
      weight: this.weight
    };
  }
}
