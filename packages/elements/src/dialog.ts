import { DialogActivationReason } from "@unislang/unifold-catalog";
import type { JsonObject } from "@unislang/unifold-contracts";
import { css, html, type PropertyDeclarations, type PropertyValues } from "lit";

import { ElementEventType } from "./enums.js";
import { adjacentDialogTabIndex, dialogTabStops } from "./dialog-focus.js";
import { focusRing, hostDefaults } from "./styles.js";
import { UnifoldElement } from "./unifold-element.js";

/**
 * Presents bounded JSON-authored content in a native modal dialog with a safe fallback.
 *
 * @tagname unifold-dialog
 * @slot - Modal dialog content.
 * @fires unifold-event - Canonical open and close activation intents.
 * @csspart trigger - Native button opening the dialog.
 * @csspart surface - Native modal dialog surface.
 * @csspart header - Dialog heading and dismissal container.
 * @csspart dismiss - Native button closing the dialog.
 */
export class UnifoldDialog extends UnifoldElement {
  static override properties: PropertyDeclarations = {
    dialogLabel: { attribute: "dialog-label" },
    disabled: { reflect: true, type: Boolean },
    dismissLabel: { attribute: "dismiss-label" },
    label: {},
    open: { attribute: false, state: true }
  };

  static override styles = [
    hostDefaults,
    focusRing,
    css`
      :host {
        display: inline-block;
      }
      [part="trigger"],
      [part="dismiss"] {
        font: inherit;
        min-block-size: var(--unifold-control-min-height, 2.75rem);
      }
      [part="surface"] {
        background: var(--unifold-color-surface, #fff);
        border: 1px solid var(--unifold-color-border, #6b7280);
        border-radius: var(--unifold-radius-md, 0.5rem);
        color: inherit;
        inline-size: min(36rem, calc(100vw - 2rem));
        max-block-size: calc(100vh - 2rem);
        overflow: auto;
        padding: var(--unifold-space-4, 1rem);
      }
      [part="surface"]:not([open]) {
        display: none;
      }
      [part="surface"][data-open] {
        display: block;
      }
      [part="surface"]::backdrop {
        background: rgb(15 23 42 / 55%);
      }
      [part="header"] {
        align-items: center;
        display: flex;
        gap: var(--unifold-space-3, 0.75rem);
        justify-content: space-between;
        margin-block-end: var(--unifold-space-3, 0.75rem);
      }
      [part="title"] {
        font-weight: 600;
      }
    `
  ];

  declare dialogLabel: string;
  declare disabled: boolean;
  declare dismissLabel: string;
  declare label: string;
  declare open: boolean;
  private inerted: ReadonlyMap<HTMLElement, boolean> = new Map();
  private returnFocus = false;

  constructor() {
    super();
    this.dialogLabel = "";
    this.disabled = false;
    this.dismissLabel = "Close dialog";
    this.label = "";
    this.open = false;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.addEventListener("keydown", this.onKeyDown);
    this.ownerDocument.addEventListener("focusin", this.onDocumentFocus, true);
  }

  override disconnectedCallback(): void {
    this.removeEventListener("keydown", this.onKeyDown);
    this.ownerDocument.removeEventListener("focusin", this.onDocumentFocus, true);
    this.open = false;
    this.restoreBackground();
    super.disconnectedCallback();
  }

  protected override willUpdate(changed: PropertyValues): void {
    if (changed.has("disabled") && this.disabled) this.closeWithoutEvent();
  }

  protected override render() {
    return html`
      <button
        part="trigger"
        type="button"
        aria-expanded=${String(this.open)}
        aria-haspopup="dialog"
        ?disabled=${this.disabled}
        @click=${this.onTriggerClick}
      >
        ${this.label}
      </button>
      <dialog
        part="surface"
        aria-label=${this.dialogLabel}
        aria-modal="true"
        ?data-open=${this.open}
        ?hidden=${!this.open}
        @cancel=${this.onCancel}
        @close=${this.onNativeClose}
      >
        ${this.renderHeader()}
        <slot></slot>
      </dialog>
    `;
  }

  private renderHeader() {
    return html`<header part="header">
      <span part="title">${this.dialogLabel}</span>
      <button part="dismiss" type="button" @click=${this.onDismissClick}>
        ${this.dismissLabel}
      </button>
    </header>`;
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed);
    if (changed.has("open")) this.syncSurface();
  }

  protected override eventProperties(): JsonObject {
    return {
      dialogLabel: this.dialogLabel,
      disabled: this.disabled,
      dismissLabel: this.dismissLabel,
      label: this.label
    };
  }

  private readonly onTriggerClick = (): void => {
    if (this.disabled || this.open) return;
    this.returnFocus = true;
    this.open = true;
    this.emitUiEvent(ElementEventType.ComponentActivated, {
      open: true,
      reason: DialogActivationReason.Trigger
    });
  };

  private readonly onDismissClick = (): void => this.requestClose(DialogActivationReason.Dismiss);

  private readonly onCancel = (event: Event): void => {
    event.preventDefault();
    this.requestClose(DialogActivationReason.Escape);
  };

  private readonly onNativeClose = (): void => {
    if (this.open) this.requestClose(DialogActivationReason.Native);
  };

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (!this.open) return;
    this.handleOpenKey(event);
  };

  private handleOpenKey(event: KeyboardEvent): void {
    if (event.key === "Escape") this.handleFallbackEscape(event);
    if (event.key === "Tab") this.trapTab(event);
  }

  private handleFallbackEscape(event: KeyboardEvent): void {
    if (this.surface().open) return;
    event.preventDefault();
    event.stopPropagation();
    this.requestClose(DialogActivationReason.Escape);
  }

  private trapTab(event: KeyboardEvent): void {
    const stops = dialogTabStops(this, this.dismiss());
    const current = event
      .composedPath()
      .find((candidate) => stops.includes(candidate as HTMLElement));
    const currentIndex = stops.indexOf(current as HTMLElement);
    const nextIndex = adjacentDialogTabIndex(currentIndex, stops.length, event.shiftKey);
    event.preventDefault();
    event.stopPropagation();
    stops[nextIndex]?.focus();
  }

  private readonly onDocumentFocus = (event: Event): void => {
    if (!this.open || event.composedPath().includes(this)) return;
    this.dismiss().focus();
  };

  private requestClose(reason: DialogActivationReason): void {
    if (!this.open) return;
    this.open = false;
    this.emitUiEvent(ElementEventType.ComponentActivated, { open: false, reason });
  }

  private closeWithoutEvent(): void {
    if (this.open) this.open = false;
  }

  private syncSurface(): void {
    const surface = this.surface();
    if (this.open) {
      this.inertBackground();
      showModal(surface);
      this.dismiss().focus();
      return;
    }
    closeDialog(surface);
    this.restoreBackground();
    this.restoreTriggerFocus();
  }

  private inertBackground(): void {
    if (this.inerted.size > 0) return;
    const values = new Map<HTMLElement, boolean>();
    for (const sibling of backgroundSiblings(this)) {
      values.set(sibling, sibling.inert);
      sibling.inert = true;
    }
    this.inerted = values;
  }

  private restoreBackground(): void {
    for (const [element, inert] of this.inerted) element.inert = inert;
    this.inerted = new Map();
  }

  private restoreTriggerFocus(): void {
    if (this.returnFocus && this.isConnected) this.trigger().focus();
    this.returnFocus = false;
  }

  private surface(): HTMLDialogElement {
    return requireElement(this.renderRoot, "[part=surface]", "Dialog surface is missing.");
  }

  private dismiss(): HTMLButtonElement {
    return requireElement(this.renderRoot, "[part=dismiss]", "Dialog dismiss button is missing.");
  }

  private trigger(): HTMLButtonElement {
    return requireElement(this.renderRoot, "[part=trigger]", "Dialog trigger is missing.");
  }
}

function showModal(dialog: HTMLDialogElement): void {
  try {
    openNativeDialog(dialog);
  } catch {
    // data-open and hidden remain the deterministic fallback.
  }
}

function closeDialog(dialog: HTMLDialogElement): void {
  try {
    closeNativeDialog(dialog);
  } catch {
    dialog.removeAttribute("open");
  }
}

function openNativeDialog(dialog: HTMLDialogElement): void {
  if (typeof dialog.showModal !== "function") return;
  if (!dialog.open) dialog.showModal();
}

function closeNativeDialog(dialog: HTMLDialogElement): void {
  if (typeof dialog.close !== "function") return;
  if (dialog.open) dialog.close();
}

function backgroundSiblings(element: HTMLElement): readonly HTMLElement[] {
  const siblings: HTMLElement[] = [];
  let branch: HTMLElement | null = element;
  while (branch !== null && branch.parentElement !== null) {
    siblings.push(...elementSiblings(branch));
    branch = branch.parentElement;
  }
  return siblings;
}

function elementSiblings(branch: HTMLElement): readonly HTMLElement[] {
  const parent = branch.parentElement;
  if (parent === null) return [];
  return [...parent.children].filter(
    (candidate): candidate is HTMLElement =>
      candidate instanceof HTMLElement && candidate !== branch
  );
}

function requireElement<T extends Element>(root: ParentNode, selector: string, message: string): T {
  const element = root.querySelector<T>(selector);
  if (element === null) throw new Error(message);
  return element;
}
