import {
  DataGridSelectionMode,
  type DataGridSort,
  type DataGridValue,
  type TableColumn,
  type TableRow
} from "@unislang/unifold-catalog";
import { UiUpdateTrigger } from "@unislang/unifold-contracts";
import { css, html, nothing, type PropertyDeclarations } from "lit";

import { cellText, nextDirection, sortedRows, toggleSelection } from "./data-grid-state.js";
import { ElementEventType } from "./enums.js";
import { focusRing, hostDefaults, validationStyles } from "./styles.js";
import { UnifoldElement } from "./unifold-element.js";

/**
 * Sorts and selects bounded authored records through native table controls.
 *
 * @tagname unifold-data-grid
 * @fires unifold-event - Canonical sort, selection, and blur intents.
 * @csspart container - Horizontally scrollable grid container.
 * @csspart table - Native table element.
 * @csspart empty - Empty-state cell.
 */
export class UnifoldDataGrid extends UnifoldElement {
  static override properties: PropertyDeclarations = {
    asyncValidators: { attribute: false },
    caption: {},
    columns: { attribute: false },
    disabled: { reflect: true, type: Boolean },
    emptyMessage: { attribute: "empty-message" },
    errorMessage: { attribute: "error-message" },
    name: {},
    rows: { attribute: false },
    selectionMode: { attribute: "selection-mode" },
    sortableColumns: { attribute: false },
    updateOn: { attribute: "update-on" },
    validators: { attribute: false },
    value: { attribute: false }
  };

  static override styles = [
    hostDefaults,
    focusRing,
    validationStyles,
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
      button {
        background: transparent;
        border: 0;
        color: inherit;
        cursor: pointer;
        font: inherit;
        font-weight: 600;
        padding: 0;
      }
      button:disabled {
        cursor: default;
      }
      [part="selection"] {
        inline-size: 1%;
        white-space: nowrap;
      }
    `
  ];

  declare asyncValidators: readonly string[];
  declare caption: string;
  declare columns: readonly TableColumn[];
  declare disabled: boolean;
  declare emptyMessage: string;
  declare errorMessage: string;
  declare name: string;
  declare rows: readonly TableRow[];
  declare selectionMode: DataGridSelectionMode;
  declare sortableColumns: readonly string[];
  declare updateOn: UiUpdateTrigger;
  declare validators: readonly string[];
  declare value: DataGridValue;

  constructor() {
    super();
    this.asyncValidators = [];
    this.caption = "";
    this.columns = [];
    this.disabled = false;
    this.emptyMessage = "No data";
    this.errorMessage = "";
    this.name = "";
    this.rows = [];
    this.selectionMode = DataGridSelectionMode.None;
    this.sortableColumns = [];
    this.updateOn = UiUpdateTrigger.Input;
    this.validators = [];
    this.value = { selectedRowIds: [] };
  }

  protected override render() {
    const errorId = `${this.id}-error`;
    return html`
      <div part="container" @focusout=${this.onFocusOut}>
        <table
          part="table"
          aria-describedby=${errorId}
          aria-invalid=${String(Boolean(this.errorMessage))}
        >
          <caption>
            ${this.caption}
          </caption>
          <thead>
            <tr>
              ${this.renderSelectionHeader()}${this.columns.map((column) =>
                this.renderHeader(column)
              )}
            </tr>
          </thead>
          <tbody>
            ${this.rows.length === 0
              ? this.renderEmpty()
              : sortedRows(this.rows, this.value.sort).map((row) => this.renderRow(row))}
          </tbody>
        </table>
      </div>
      <span id=${errorId} role="alert">${this.errorMessage}</span>
    `;
  }

  protected override eventProperties() {
    return {
      ...super.eventProperties(),
      asyncValidators: this.asyncValidators,
      caption: this.caption,
      columns: this.columns,
      disabled: this.disabled,
      emptyMessage: this.emptyMessage,
      errorMessage: this.errorMessage,
      name: this.name,
      rows: this.rows,
      selectionMode: this.selectionMode,
      sortableColumns: this.sortableColumns,
      updateOn: this.updateOn,
      validators: this.validators,
      value: this.value
    };
  }

  protected override eventValue() {
    return this.value;
  }

  private renderSelectionHeader() {
    if (this.selectionMode === DataGridSelectionMode.None) return nothing;
    if (this.selectionMode === DataGridSelectionMode.Single)
      return html`<th part="selection" scope="col">Select</th>`;
    return this.renderMultipleSelectionHeader();
  }

  private renderMultipleSelectionHeader() {
    const selected = this.selectedRows();
    return html`<th part="selection" scope="col">
      <input
        aria-label="Select all rows"
        type="checkbox"
        ?checked=${allRowsSelected(this.rows.length, selected.length)}
        .indeterminate=${partiallySelected(this.rows.length, selected.length)}
        ?disabled=${selectAllDisabled(this.disabled, this.rows.length)}
        @change=${this.onSelectAll}
      />
    </th>`;
  }

  private renderHeader(column: TableColumn) {
    if (!this.sortableColumns.includes(column.key)) return renderPlainHeader(column);
    const direction = sortDirection(this.value, column.key);
    return html`<th scope="col" aria-sort=${direction}>
      <button type="button" ?disabled=${this.disabled} @click=${() => this.onSort(column.key)}>
        ${column.label}
      </button>
    </th>`;
  }

  private renderRow(row: TableRow) {
    return html`<tr data-row-id=${row.id}>
      ${this.renderSelection(row)}
      ${this.columns.map((column, index) => this.renderCell(row, column, index))}
    </tr>`;
  }

  private renderSelection(row: TableRow) {
    if (this.selectionMode === DataGridSelectionMode.None) return nothing;
    const type = this.selectionMode === DataGridSelectionMode.Single ? "radio" : "checkbox";
    return html`<td part="selection">
      <input
        aria-label=${`Select ${rowLabel(row, this.columns)}`}
        name=${selectionName(this.name, this.id)}
        type=${type}
        ?checked=${this.value.selectedRowIds.includes(row.id)}
        ?disabled=${this.disabled}
        @change=${(event: Event) => this.onSelect(row.id, event)}
      />
    </td>`;
  }

  private renderCell(row: TableRow, column: TableColumn, index: number) {
    const value = cellText(row.cells[column.key]);
    return index === 0 ? html`<th scope="row">${value}</th>` : html`<td>${value}</td>`;
  }

  private renderEmpty() {
    const count = this.columns.length + Number(this.selectionMode !== DataGridSelectionMode.None);
    if (count === 0) return nothing;
    return html`<tr>
      <td part="empty" colspan=${String(count)}>${this.emptyMessage}</td>
    </tr>`;
  }

  private selectedRows(): readonly string[] {
    const rowIds = new Set(this.rows.map(({ id }) => id));
    return this.value.selectedRowIds.filter((id) => rowIds.has(id));
  }

  private readonly onSelectAll = (event: Event): void => {
    const checked = (event.currentTarget as HTMLInputElement).checked;
    this.commitValue({
      ...this.value,
      selectedRowIds: checked ? this.rows.map(({ id }) => id) : []
    });
  };

  private onSelect(rowId: string, event: Event): void {
    const checked = (event.currentTarget as HTMLInputElement).checked;
    const selectedRowIds =
      this.selectionMode === DataGridSelectionMode.Single
        ? checked
          ? [rowId]
          : []
        : toggleSelection(this.value.selectedRowIds, rowId, checked);
    this.commitValue({ ...this.value, selectedRowIds });
  }

  private onSort(key: string): void {
    const direction = nextDirection(this.value, key);
    this.commitValue({ ...this.value, sort: { direction, key } });
  }

  private commitValue(value: DataGridValue): void {
    this.value = value;
    this.emitUiEvent(ElementEventType.ControlInput, { value });
  }

  private readonly onFocusOut = (event: FocusEvent): void => {
    const container = event.currentTarget as HTMLElement;
    if (event.relatedTarget instanceof Node && container.contains(event.relatedTarget)) return;
    this.emitUiEvent(ElementEventType.ControlBlurred, { value: this.value });
  };
}

function sortDirection(value: DataGridValue, key: string): DataGridSort["direction"] | "none" {
  const sort = value.sort;
  if (sort === undefined) return "none";
  return sort.key === key ? sort.direction : "none";
}

function renderPlainHeader(column: TableColumn) {
  return html`<th scope="col">${column.label}</th>`;
}

function allRowsSelected(rowCount: number, selectedCount: number): boolean {
  return rowCount > 0 && selectedCount === rowCount;
}

function partiallySelected(rowCount: number, selectedCount: number): boolean {
  return selectedCount > 0 && selectedCount < rowCount;
}

function selectAllDisabled(disabled: boolean, rowCount: number): boolean {
  return disabled || rowCount === 0;
}

function selectionName(name: string, id: string): string {
  return name === "" ? `${id}-selection` : name;
}

function rowLabel(row: TableRow, columns: readonly TableColumn[]): string {
  return cellText(columns[0] === undefined ? undefined : row.cells[columns[0].key]) || row.id;
}
