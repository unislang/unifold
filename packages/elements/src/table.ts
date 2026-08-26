import type { TableCellValue, TableColumn, TableRow } from "@unislang/unifold-catalog";
import { css, html, nothing, type PropertyDeclarations } from "lit";

import { hostDefaults } from "./styles.js";
import { UnifoldElement } from "./unifold-element.js";

/**
 * Renders bounded authored records through native table semantics.
 *
 * @tagname unifold-table
 * @csspart container - Horizontally scrollable table container.
 * @csspart table - Native table element.
 * @csspart empty - Empty-state cell.
 */
export class UnifoldTable extends UnifoldElement {
  static override properties: PropertyDeclarations = {
    caption: {},
    columns: { attribute: false },
    emptyMessage: { attribute: "empty-message" },
    rows: { attribute: false }
  };

  static override styles = [
    hostDefaults,
    css`
      :host {
        display: block;
      }
      [part="container"] {
        max-width: 100%;
        overflow-x: auto;
      }
      table {
        border-collapse: collapse;
        inline-size: 100%;
      }
      caption {
        font-weight: 600;
        padding-block: var(--unifold-space-2, 0.5rem);
        text-align: start;
      }
      th,
      td {
        border-block-end: 1px solid var(--unifold-color-border, #d1d5db);
        padding: var(--unifold-space-2, 0.5rem);
        text-align: start;
      }
      thead th {
        background: var(--unifold-color-surface-subtle, #f3f4f6);
      }
    `
  ];

  declare caption: string;
  declare columns: readonly TableColumn[];
  declare emptyMessage: string;
  declare rows: readonly TableRow[];

  constructor() {
    super();
    this.caption = "";
    this.columns = [];
    this.emptyMessage = "No data";
    this.rows = [];
  }

  protected override render() {
    return html`
      <div part="container">
        <table part="table">
          <caption>
            ${this.caption}
          </caption>
          <thead>
            <tr>
              ${this.columns.map((column) => html`<th scope="col">${column.label}</th>`)}
            </tr>
          </thead>
          <tbody>
            ${this.rows.length === 0
              ? this.renderEmpty()
              : this.rows.map((row) => this.renderRow(row))}
          </tbody>
        </table>
      </div>
    `;
  }

  protected override eventProperties() {
    return {
      ...super.eventProperties(),
      caption: this.caption,
      columns: this.columns,
      emptyMessage: this.emptyMessage,
      rows: this.rows
    };
  }

  private renderRow(row: TableRow) {
    return html`<tr data-row-id=${row.id}>
      ${this.columns.map((column, index) => this.renderCell(row, column, index))}
    </tr>`;
  }

  private renderCell(row: TableRow, column: TableColumn, index: number) {
    const value = cellText(row.cells[column.key]);
    return index === 0 ? html`<th scope="row">${value}</th>` : html`<td>${value}</td>`;
  }

  private renderEmpty() {
    if (this.columns.length === 0) return nothing;
    return html`<tr>
      <td part="empty" colspan=${String(this.columns.length)}>${this.emptyMessage}</td>
    </tr>`;
  }
}

function cellText(value: TableCellValue | undefined): string {
  return value === null || value === undefined ? "" : String(value);
}
