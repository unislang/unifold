import type { JsonObject } from "@unislang/unifold-contracts";
import type { ChoiceOption, TableColumn, TableRow } from "@unislang/unifold-catalog";
import { css, html, type PropertyDeclarations, type PropertyValues } from "lit";

import { cellText } from "./data-grid-state.js";
import { UnifoldVirtualList } from "./virtual-list.js";

/**
 * Selects one virtualized master record and presents its scalar detail fields.
 *
 * @tagname unifold-master-detail
 * @fires unifold-event - Canonical selection and blur intents.
 * @csspart layout - Responsive master-detail layout.
 * @csspart master - Virtualized master-list pane.
 * @csspart detail - Selected-record detail pane.
 */
export class UnifoldMasterDetail extends UnifoldVirtualList {
  static override properties: PropertyDeclarations = {
    columns: { attribute: false },
    detailLabel: { attribute: "detail-label" },
    emptyMessage: { attribute: "empty-message" },
    masterColumn: { attribute: "master-column" },
    noSelectionMessage: { attribute: "no-selection-message" },
    rows: { attribute: false }
  };

  static override styles = [
    ...UnifoldVirtualList.styles,
    css`
      :host {
        container-type: inline-size;
      }
      [part="layout"] {
        display: grid;
        gap: var(--unifold-space-4, 1rem);
        grid-template-columns: minmax(12rem, 1fr) minmax(0, 2fr);
      }
      [part="master"],
      [part="detail"] {
        min-inline-size: 0;
      }
      [part="detail"] {
        border: 1px solid var(--unifold-color-border, #d1d5db);
        border-radius: var(--unifold-radius-md, 0.375rem);
        padding: var(--unifold-space-4, 1rem);
      }
      dl {
        display: grid;
        gap: var(--unifold-space-2, 0.5rem) var(--unifold-space-4, 1rem);
        grid-template-columns: minmax(8rem, max-content) minmax(0, 1fr);
        margin: 0;
      }
      dt {
        font-weight: 600;
      }
      dd {
        margin: 0;
        overflow-wrap: anywhere;
      }
      @container (max-width: 40rem) {
        [part="layout"] {
          grid-template-columns: minmax(0, 1fr);
        }
      }
    `
  ];

  declare columns: readonly TableColumn[];
  declare detailLabel: string;
  declare emptyMessage: string;
  declare masterColumn: string;
  declare noSelectionMessage: string;
  declare rows: readonly TableRow[];

  constructor() {
    super();
    this.columns = [];
    this.detailLabel = "Details";
    this.emptyMessage = "No records";
    this.masterColumn = "";
    this.noSelectionMessage = "Select a record to view details";
    this.rows = [];
  }

  protected override willUpdate(changed: PropertyValues): void {
    this.synchronizeMasterData(changed);
    super.willUpdate(changed);
  }

  protected override render() {
    return html`<div part="layout">
      <section part="master">${super.render()}</section>
      ${this.renderDetail()}
    </div>`;
  }

  protected override eventProperties(): JsonObject {
    return {
      asyncValidators: this.asyncValidators,
      columns: this.columns,
      detailLabel: this.detailLabel,
      disabled: this.disabled,
      emptyMessage: this.emptyMessage,
      errorMessage: this.errorMessage,
      itemHeight: this.itemHeight,
      label: this.label,
      masterColumn: this.masterColumn,
      name: this.name,
      noSelectionMessage: this.noSelectionMessage,
      overscan: this.overscan,
      rows: this.rows,
      updateOn: this.updateOn,
      validators: this.validators,
      value: this.value,
      viewportHeight: this.viewportHeight
    };
  }

  private renderDetail() {
    const row = this.rows.find(({ id }) => id === this.value);
    return html`<section part="detail" role="region" aria-label=${this.detailLabel}>
      ${this.renderDetailContent(row)}
    </section>`;
  }

  private synchronizeMasterData(changed: PropertyValues): void {
    if (!changed.has("rows") && !changed.has("masterColumn")) return;
    this.options = masterOptions(this.rows, this.masterColumn);
    this.activeIndex = preferredIndex(this.options, this.value);
  }

  private renderDetailContent(row: TableRow | undefined) {
    if (this.rows.length === 0) return html`<p>${this.emptyMessage}</p>`;
    if (row === undefined) return html`<p>${this.noSelectionMessage}</p>`;
    return html`<dl>
      ${this.columns.map(
        (column) =>
          html`<dt>${column.label}</dt>
            <dd>${cellText(row.cells[column.key])}</dd>`
      )}
    </dl>`;
  }
}

function masterOptions(rows: readonly TableRow[], masterColumn: string): readonly ChoiceOption[] {
  return rows.map((row) => ({
    label: cellText(row.cells[masterColumn]) || row.id,
    value: row.id
  }));
}

function preferredIndex(options: readonly ChoiceOption[], value: string): number {
  const selected = options.findIndex((option) => option.value === value);
  return selected >= 0 ? selected : options.length === 0 ? -1 : 0;
}
