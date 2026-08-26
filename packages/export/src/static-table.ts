import type { TableCellValue, TableColumn, TableRow } from "@unislang/unifold-catalog";
import { DataClassification, type JsonValue } from "@unislang/unifold-contracts";
import type { UnifoldIrDocument, UnifoldIrNode } from "@unislang/unifold-ir";

import { escapeHtml } from "./html-escape.js";

interface StaticTableContext {
  readonly document: UnifoldIrDocument;
  readonly node: UnifoldIrNode;
}

export function renderStaticTable({ document, node }: StaticTableContext): string {
  if (!isPublic(document, node)) return emptyPrivateTable();
  const columns = property(node, "columns") as unknown as readonly TableColumn[];
  const rows = property(node, "rows") as unknown as readonly TableRow[];
  const caption = textProperty(node, "caption");
  const head = columns.map(({ label }) => `<th scope="col">${escapeHtml(label)}</th>`).join("");
  const body = rows.length === 0 ? renderEmpty(node, columns.length) : renderRows(rows, columns);
  return `<table><caption>${caption}</caption><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}

function renderRows(rows: readonly TableRow[], columns: readonly TableColumn[]): string {
  return rows.map((row) => renderRow(row, columns)).join("");
}

function renderRow(row: TableRow, columns: readonly TableColumn[]): string {
  const cells = columns.map((column, index) => renderCell(row.cells[column.key], index)).join("");
  return `<tr${attribute("data-row-id", row.id)}>${cells}</tr>`;
}

function renderCell(value: TableCellValue | undefined, index: number): string {
  const tag = index === 0 ? "th" : "td";
  const scope = index === 0 ? ' scope="row"' : "";
  return `<${tag}${scope}>${escapeHtml(cellText(value))}</${tag}>`;
}

function renderEmpty(node: UnifoldIrNode, columns: number): string {
  if (columns === 0) return "";
  return `<tr><td colspan="${columns}">${textProperty(node, "emptyMessage")}</td></tr>`;
}

function cellText(value: TableCellValue | undefined): string {
  return value === null || value === undefined ? "" : String(value);
}

function isPublic(document: UnifoldIrDocument, node: UnifoldIrNode): boolean {
  if (node.binding === undefined) return true;
  return document.storesById[node.binding.store]?.classification === DataClassification.Public;
}

function property(node: UnifoldIrNode, name: string): JsonValue | undefined {
  return node.properties[name];
}

function textProperty(node: UnifoldIrNode, name: string): string {
  const value = property(node, name);
  return escapeHtml(typeof value === "string" ? value : "");
}

function emptyPrivateTable(): string {
  return "<table><caption></caption><thead></thead><tbody></tbody></table>";
}

function attribute(name: string, value: string): string {
  return ` ${name}="${escapeHtml(value)}"`;
}
