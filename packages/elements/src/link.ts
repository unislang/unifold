import { isSafeUrl, LinkTarget } from "@unislang/unifold-catalog";
import { css, html, type PropertyDeclarations } from "lit";

import { ElementEventType } from "./enums.js";
import { focusRing, hostDefaults } from "./styles.js";
import { UnifoldElement } from "./unifold-element.js";

/**
 * Navigates through a safe native anchor while publishing canonical activation evidence.
 *
 * @tagname unifold-link
 * @slot - Optional visible link content appended to the label property.
 * @fires unifold-event - Canonical link activation intent.
 * @cssprop --unifold-color-primary - Link text color.
 */
export class UnifoldLink extends UnifoldElement {
  static override properties: PropertyDeclarations = {
    href: { reflect: true },
    label: {},
    target: { reflect: true }
  };

  static override styles = [
    hostDefaults,
    focusRing,
    css`
      a {
        color: var(--unifold-color-primary, #1d4ed8);
        font-weight: 600;
        text-decoration-thickness: 0.125em;
        text-underline-offset: 0.15em;
      }
    `
  ];

  declare href: string;
  declare label: string;
  declare target: LinkTarget;

  constructor() {
    super();
    this.href = "#";
    this.label = "";
    this.target = LinkTarget.Self;
  }

  protected override render() {
    return html`
      <a
        href=${this.safeHref()}
        target=${this.target}
        rel=${this.relationship()}
        @click=${this.activate}
      >
        ${this.label}<slot></slot>
      </a>
    `;
  }

  protected override eventProperties() {
    return { ...super.eventProperties(), href: this.href, label: this.label, target: this.target };
  }

  private safeHref(): string {
    return isSafeUrl(this.href) ? this.href : "#";
  }

  private relationship(): string | undefined {
    return this.target === LinkTarget.Blank ? "noopener noreferrer" : undefined;
  }

  private readonly activate = (): void => {
    this.emitUiEvent(ElementEventType.ComponentActivated, {
      href: this.safeHref(),
      target: this.target
    });
  };
}
