import {
  DataGridSelectionMode,
  DataGridSortDirection,
  getCoreDescriptor,
  type DataGridSort,
  type DataGridValue,
  type TableCellValue,
  type TableColumn,
  type TableRow
} from "@unislang/unifold-catalog";
import { CoreComponentType, DataClassification, type JsonValue } from "@unislang/unifold-contracts";
import type { UnifoldIrDocument, UnifoldIrNode } from "@unislang/unifold-ir";

import { escapeHtml } from "./html-escape.js";

interface StaticDataGridContext {
  readonly document: UnifoldIrDocument;
  readonly node: UnifoldIrNode;
}

export function renderStaticDataGrid({ document, node }: StaticDataGridContext): string {
  if (!isPublic(document, node)) return emptyPrivateGrid();
  const columns = property(node, "columns") as unknown as readonly TableColumn[];
  const rows = property(node, "rows") as unknown as readonly TableRow[];
  const value = property(node, "value") as unknown as DataGridValue;
  const mode = textProperty(node, "selectionMode") as DataGridSelectionMode;
  const sortable = property(node, "sortableColumns") as unknown as readonly string[];
  const header = renderSelectionHeader(rows, value, mode) + renderHeaders(columns, sortable, value);
  const body = renderBody(node, rows, columns, value, mode);
  const error = textProperty(node, "errorMessage");
  return `<table aria-invalid="${String(error !== "")}"><caption>${textProperty(node, "caption")}</caption><thead><tr>${header}</tr></thead><tbody>${body}</tbody></table>${renderError(error)}`;
}

function renderBody(
  node: UnifoldIrNode,
  rows: readonly TableRow[],
  columns: readonly TableColumn[],
  value: DataGridValue,
  mode: DataGridSelectionMode
): string {
  return rows.length === 0
    ? renderEmpty(node, columns.length, mode)
    : renderRows(rows, columns, value, mode);
}

function renderError(error: string): string {
  return error === "" ? "" : `<span role="alert">${error}</span>`;
}

function renderSelectionHeader(
  rows: readonly TableRow[],
  value: DataGridValue,
  mode: DataGridSelectionMode
): string {
  if (mode === DataGridSelectionMode.None) return "";
  if (mode === DataGridSelectionMode.Single) return '<th scope="col">Select</th>';
  return renderMultipleSelectionHeader(rows, value);
}

function renderMultipleSelectionHeader(rows: readonly TableRow[], value: DataGridValue): string {
  const all = allRowsSelected(rows, value.selectedRowIds);
  return `<th scope="col"><input aria-label="Select all rows" type="checkbox"${booleanAttribute("checked", all)} disabled></th>`;
}

function renderHeaders(
  columns: readonly TableColumn[],
  sortable: readonly string[],
  value: DataGridValue
): string {
  return columns.map((column) => renderHeader(column, sortable, value)).join("");
}

function renderHeader(
  column: TableColumn,
  sortable: readonly string[],
  value: DataGridValue
): string {
  const ariaSort = sortable.includes(column.key)
    ? attribute("aria-sort", sortDirection(value, column.key))
    : "";
  return `<th scope="col"${ariaSort}>${escapeHtml(column.label)}</th>`;
}

function renderRows(
  rows: readonly TableRow[],
  columns: readonly TableColumn[],
  value: DataGridValue,
  mode: DataGridSelectionMode
): string {
  return sortedRows(rows, value)
    .map((row) => renderRow(row, columns, value, mode))
    .join("");
}

function renderRow(
  row: TableRow,
  columns: readonly TableColumn[],
  value: DataGridValue,
  mode: DataGridSelectionMode
): string {
  const selection = renderSelection(row, columns, value, mode);
  const cells = columns.map((column, index) => renderCell(row.cells[column.key], index)).join("");
  return `<tr${attribute("data-row-id", row.id)}>${selection}${cells}</tr>`;
}

function renderSelection(
  row: TableRow,
  columns: readonly TableColumn[],
  value: DataGridValue,
  mode: DataGridSelectionMode
): string {
  if (mode === DataGridSelectionMode.None) return "";
  const type = mode === DataGridSelectionMode.Single ? "radio" : "checkbox";
  const checked = value.selectedRowIds.includes(row.id);
  return `<td><input${attribute("aria-label", `Select ${rowLabel(row, columns)}`)} type="${type}"${booleanAttribute("checked", checked)} disabled></td>`;
}

function renderCell(value: TableCellValue | undefined, index: number): string {
  const tag = index === 0 ? "th" : "td";
  const scope = index === 0 ? ' scope="row"' : "";
  return `<${tag}${scope}>${escapeHtml(cellText(value))}</${tag}>`;
}

function renderEmpty(
  node: UnifoldIrNode,
  columnCount: number,
  mode: DataGridSelectionMode
): string {
  const colspan = columnCount + Number(mode !== DataGridSelectionMode.None);
  return `<tr><td colspan="${colspan}">${textProperty(node, "emptyMessage")}</td></tr>`;
}

function sortedRows(rows: readonly TableRow[], value: DataGridValue): readonly TableRow[] {
  if (value.sort === undefined) return rows;
  const multiplier = value.sort.direction === DataGridSortDirection.Ascending ? 1 : -1;
  const key = value.sort.key;
  return rows
    .map((row, index) => ({ index, row }))
    .sort(
      (left, right) =>
        multiplier * compareCells(left.row.cells[key], right.row.cells[key]) ||
        left.index - right.index
    )
    .map(({ row }) => row);
}

function compareCells(left: TableCellValue | undefined, right: TableCellValue | undefined): number {
  if (typeof left === "number" && typeof right === "number") return left - right;
  return cellText(left).localeCompare(cellText(right), undefined, { numeric: true });
}

function rowLabel(row: TableRow, columns: readonly TableColumn[]): string {
  return cellText(columns[0] === undefined ? undefined : row.cells[columns[0].key]) || row.id;
}

function cellText(value: TableCellValue | undefined): string {
  return value === null || value === undefined ? "" : String(value);
}

function property(node: UnifoldIrNode, name: string): JsonValue | undefined {
  const value = node.properties[name];
  if (value !== undefined) return value;
  return defaultProperty(name);
}

function defaultProperty(name: string): JsonValue | undefined {
  const descriptor = getCoreDescriptor(CoreComponentType.DataGrid);
  if (descriptor === undefined) return undefined;
  return descriptor.properties.find((candidate) => candidate.name === name)?.defaultValue;
}

function textProperty(node: UnifoldIrNode, name: string): string {
  const value = property(node, name);
  return escapeHtml(typeof value === "string" ? value : "");
}

function isPublic(document: UnifoldIrDocument, node: UnifoldIrNode): boolean {
  if (node.binding === undefined) return true;
  return document.storesById[node.binding.store]?.classification === DataClassification.Public;
}

function emptyPrivateGrid(): string {
  return '<table aria-invalid="false"><caption></caption><thead></thead><tbody></tbody></table>';
}

function attribute(name: string, value: string): string {
  return ` ${name}="${escapeHtml(value)}"`;
}

function booleanAttribute(name: string, enabled: boolean): string {
  return enabled ? ` ${name}` : "";
}

function allRowsSelected(rows: readonly TableRow[], selected: readonly string[]): boolean {
  return rows.length > 0 && rows.every(({ id }) => selected.includes(id));
}

function sortDirection(value: DataGridValue, key: string): DataGridSort["direction"] | "none" {
  const sort = value.sort;
  if (sort === undefined) return "none";
  return sort.key === key ? sort.direction : "none";
}
