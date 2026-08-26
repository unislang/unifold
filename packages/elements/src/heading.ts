import { HeadingLevel, TextTone } from "@unislang/unifold-catalog";
import { css, type PropertyDeclarations } from "lit";
import { html, unsafeStatic } from "lit/static-html.js";

import { hostDefaults } from "./styles.js";
import { UnifoldElement } from "./unifold-element.js";

const headingLevels = new Set(Object.values(HeadingLevel));

/**
 * Renders escaped content at one declared native heading level.
 *
 * @tagname unifold-heading
 * @csspart heading - Native heading element.
 * @cssprop --unifold-color-muted - Muted heading color.
 * @cssprop --unifold-color-danger - Danger heading color.
 */
export class UnifoldHeading extends UnifoldElement {
  static override properties: PropertyDeclarations = {
    content: {},
    level: { reflect: true },
    tone: { reflect: true }
  };

  static override styles = [
    hostDefaults,
    css`
      [part="heading"] {
        line-height: 1.25;
        margin: 0;
      }
      :host([tone="muted"]) [part="heading"] {
        color: var(--unifold-color-muted, #4b5563);
      }
      :host([tone="danger"]) [part="heading"] {
        color: var(--unifold-color-danger, #b91c1c);
      }
    `
  ];

  declare content: string;
  declare level: HeadingLevel;
  declare tone: TextTone;

  constructor() {
    super();
    this.content = "";
    this.level = HeadingLevel.Two;
    this.tone = TextTone.Default;
  }

  protected override render() {
    const tagName = unsafeStatic(`h${this.safeLevel()}`);
    return html`<${tagName} part="heading">${this.content}</${tagName}>`;
  }

  protected override eventProperties() {
    return {
      ...super.eventProperties(),
      content: this.content,
      level: this.level,
      tone: this.tone
    };
  }

  private safeLevel(): HeadingLevel {
    return headingLevels.has(this.level) ? this.level : HeadingLevel.Two;
  }
}
