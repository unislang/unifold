import type { ErrorSummaryItem } from "@unislang/unifold-catalog";
import { css, html, nothing, type PropertyDeclarations } from "lit";

import { ElementEventType } from "./enums.js";
import { focusRing, hostDefaults } from "./styles.js";
import { UnifoldElement } from "./unifold-element.js";

/**
 * Announces aggregate errors and focuses their exact JSON control targets.
 *
 * @tagname unifold-error-summary
 * @fires unifold-event - Canonical activation intent with the selected target ID.
 * @csspart container - Aggregate error alert.
 * @csspart link - One focus-routing error link.
 */
export class UnifoldErrorSummary extends UnifoldElement {
  static override properties: PropertyDeclarations = {
    errors: { attribute: false },
    title: {}
  };
  static override styles = [
    hostDefaults,
    focusRing,
    css`
      [part="container"] {
        border-inline-start: 0.25rem solid var(--unifold-color-danger, #b91c1c);
        padding: var(--unifold-space-3, 0.75rem);
      }
      h2 {
        font-size: 1rem;
        margin-block: 0 var(--unifold-space-2, 0.5rem);
      }
      ul {
        margin: 0;
        padding-inline-start: var(--unifold-space-4, 1rem);
      }
      a {
        color: var(--unifold-color-danger, #b91c1c);
      }
    `
  ];

  declare errors: readonly ErrorSummaryItem[];
  declare title: string;

  constructor() {
    super();
    this.errors = [];
    this.title = "There is a problem";
  }

  protected override render() {
    if (this.errors.length === 0) return nothing;
    const titleId = `${this.id}__title`;
    return html`
      <div
        part="container"
        role="alert"
        aria-live="polite"
        aria-labelledby=${titleId}
        tabindex="-1"
      >
        <h2 id=${titleId}>${this.title}</h2>
        <ul>
          ${this.errors.map((error) => this.renderError(error))}
        </ul>
      </div>
    `;
  }

  protected override eventProperties() {
    return { ...super.eventProperties(), errors: this.errors, title: this.title };
  }

  private renderError(error: ErrorSummaryItem) {
    return html`<li>
      <a
        part="link"
        href=${`#${encodeURIComponent(error.targetId)}`}
        data-target-id=${error.targetId}
        @click=${this.activate}
        >${error.message}</a
      >
    </li>`;
  }

  private readonly activate = (event: MouseEvent): void => {
    event.preventDefault();
    const link = event.currentTarget as HTMLAnchorElement;
    const targetId = link.dataset["targetId"];
    if (targetId === undefined) return;
    focusNodeTarget(this, targetId);
    this.emitUiEvent(ElementEventType.ComponentActivated, { targetId });
  };
}

function focusNodeTarget(source: HTMLElement, targetId: string): void {
  const target = findNodeTarget(source.ownerDocument, targetId);
  if (target === undefined) return;
  focusTarget(target);
}

function focusTarget(target: HTMLElement): void {
  const control = target.shadowRoot?.querySelector<HTMLElement>(
    "input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), a[href]"
  );
  (control ?? target).focus();
}

function findNodeTarget(root: Document | ShadowRoot, targetId: string): HTMLElement | undefined {
  const roots: (Document | ShadowRoot)[] = [root];
  for (const candidateRoot of roots) {
    const target = candidateRoot.getElementById(targetId);
    if (target instanceof HTMLElement) return target;
    candidateRoot.querySelectorAll("*").forEach((element) => {
      if (element.shadowRoot !== null) roots.push(element.shadowRoot);
    });
  }
  return undefined;
}
