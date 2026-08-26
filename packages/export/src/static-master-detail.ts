import {
  getCoreDescriptor,
  type TableCellValue,
  type TableColumn,
  type TableRow
} from "@unislang/unifold-catalog";
import { CoreComponentType, DataClassification, type JsonValue } from "@unislang/unifold-contracts";
import type { UnifoldIrDocument, UnifoldIrNode } from "@unislang/unifold-ir";

import { escapeHtml } from "./html-escape.js";

const STATIC_MASTER_LIMIT = 200;

interface StaticMasterDetailContext {
  readonly document: UnifoldIrDocument;
  readonly node: UnifoldIrNode;
}

export function renderStaticMasterDetail({ document, node }: StaticMasterDetailContext): string {
  const isPublic = classification(document, node) === DataClassification.Public;
  if (!isPublic) return emptyPrivateMasterDetail();
  const rows = rowProperty(node);
  const value = textProperty(node, "value");
  const columns = columnProperty(node);
  const masterColumn = textProperty(node, "masterColumn");
  const masters = visibleRows(rows, value)
    .map((row, index) => renderMaster(row, rows, masterColumn, value, index))
    .join("");
  const summary = rows.length > STATIC_MASTER_LIMIT ? renderSummary(rows, masters) : "";
  const detail = renderDetail(node, columns, rows, value);
  return `<div><section><div role="listbox"${attribute("aria-label", textProperty(node, "label"))}>${masters}</div>${summary}</section>${detail}</div>`;
}

function emptyPrivateMasterDetail(): string {
  return '<div><section><div role="listbox" aria-label=""></div></section><section role="region" aria-label=""></section></div>';
}

function visibleRows(rows: readonly TableRow[], value: string): readonly TableRow[] {
  const visible = rows.slice(0, STATIC_MASTER_LIMIT);
  const selected = rows.find(({ id }) => id === value);
  if (selected === undefined || visible.includes(selected)) return visible;
  return [...visible, selected];
}

function renderMaster(
  row: TableRow,
  rows: readonly TableRow[],
  masterColumn: string,
  value: string,
  visibleIndex: number
): string {
  const position = rows.indexOf(row) + 1;
  const label = cellText(row.cells[masterColumn]) || `Item ${visibleIndex + 1}`;
  return `<div role="option"${attribute("aria-posinset", String(position))}${attribute(
    "aria-setsize",
    String(rows.length)
  )}${attribute("aria-selected", String(row.id === value))}>${escapeHtml(label)}</div>`;
}

function renderSummary(rows: readonly TableRow[], masters: string): string {
  const count = (masters.match(/role="option"/gu) ?? []).length;
  return `<p>${count} of ${rows.length} records</p>`;
}

function renderDetail(
  node: UnifoldIrNode,
  columns: readonly TableColumn[],
  rows: readonly TableRow[],
  value: string
): string {
  const label = textProperty(node, "detailLabel");
  const row = rows.find(({ id }) => id === value);
  let content = `<p>${textProperty(node, "noSelectionMessage")}</p>`;
  if (rows.length === 0) content = `<p>${textProperty(node, "emptyMessage")}</p>`;
  else if (row !== undefined) content = renderFields(columns, row);
  return `<section role="region"${attribute("aria-label", label)}>${content}</section>`;
}

function renderFields(columns: readonly TableColumn[], row: TableRow): string {
  const fields = columns
    .map(
      (column) =>
        `<dt>${escapeHtml(column.label)}</dt><dd>${escapeHtml(cellText(row.cells[column.key]))}</dd>`
    )
    .join("");
  return `<dl>${fields}</dl>`;
}

function columnProperty(node: UnifoldIrNode): readonly TableColumn[] {
  return property(node, "columns") as unknown as readonly TableColumn[];
}

function rowProperty(node: UnifoldIrNode): readonly TableRow[] {
  return property(node, "rows") as unknown as readonly TableRow[];
}

function textProperty(node: UnifoldIrNode, name: string): string {
  const value = property(node, name);
  return typeof value === "string" ? value : "";
}

function property(node: UnifoldIrNode, name: string): JsonValue | undefined {
  const value = node.properties[name];
  if (value !== undefined) return value;
  const descriptor = getCoreDescriptor(CoreComponentType.MasterDetail);
  if (descriptor === undefined) return undefined;
  return defaultValue(descriptor.properties, name);
}

function defaultValue(
  properties: readonly { readonly defaultValue?: JsonValue; readonly name: string }[],
  name: string
): JsonValue | undefined {
  return properties.find((candidate) => candidate.name === name)?.defaultValue;
}

function classification(document: UnifoldIrDocument, node: UnifoldIrNode): DataClassification {
  if (node.binding === undefined) return DataClassification.Public;
  const store = document.storesById[node.binding.store];
  if (store === undefined) return DataClassification.NeverExport;
  return store.classification;
}

function cellText(value: TableCellValue | undefined): string {
  return value === null || value === undefined ? "" : String(value);
}

function attribute(name: string, value: string): string {
  return ` ${name}="${escapeHtml(value)}"`;
}
