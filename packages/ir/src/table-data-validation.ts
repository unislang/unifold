import {
  CatalogConstraintKind,
  type CatalogConstraintDescriptor,
  type CatalogTableDataConstraint,
  type TableColumn,
  type TableRow
} from "@unislang/unifold-catalog";

import { errorDiagnostic } from "./diagnostics.js";
import { DiagnosticCode } from "./enums.js";
import { isPlainObject } from "./json-safety.js";
import type { CompilerDiagnostic } from "./types.js";

const MAX_COLUMNS = 64;
const MAX_ROWS = 10_000;
const columnKeys = new Set(["key", "label"]);
const rowKeys = new Set(["cells", "id"]);
const scalarTypes = new Set(["boolean", "string"]);
const unsafeKeys = new Set(["__proto__", "constructor", "prototype"]);

export function isTableColumnList(value: unknown): value is readonly TableColumn[] {
  if (!Array.isArray(value)) return false;
  return [value.length > 0, value.length <= MAX_COLUMNS, value.every(isColumn)].every(Boolean);
}

export function isTableRowList(value: unknown): value is readonly TableRow[] {
  if (!Array.isArray(value)) return false;
  return [value.length <= MAX_ROWS, value.every(isRow)].every(Boolean);
}

export function validateTableDataConstraint(
  node: Readonly<Record<string, unknown>>,
  constraint: CatalogConstraintDescriptor,
  path: string,
  diagnostics: CompilerDiagnostic[]
): void {
  if (constraint.kind !== CatalogConstraintKind.TableData) return;
  const data = readTableData(node, constraint);
  if (!data) return;
  validateTableData(data.columns, data.rows, constraint, path, nodeId(node), diagnostics);
}

function isColumn(value: unknown): value is TableColumn {
  if (!isPlainObject(value)) return false;
  return [
    isTableIdentifier(value["key"]),
    typeof value["label"] === "string",
    Object.keys(value).every((key) => columnKeys.has(key))
  ].every(Boolean);
}

function isRow(value: unknown): value is TableRow {
  if (!isPlainObject(value)) return false;
  return [
    isTableIdentifier(value["id"]),
    validCellRecord(value["cells"]),
    Object.keys(value).every((key) => rowKeys.has(key))
  ].every(Boolean);
}

function validCellRecord(value: unknown): boolean {
  return isPlainObject(value) && validCells(value);
}

function validCells(cells: Readonly<Record<string, unknown>>): boolean {
  return Object.entries(cells).every(([key, value]) => isTableIdentifier(key) && scalar(value));
}

function scalar(value: unknown): boolean {
  return [value === null, scalarTypes.has(typeof value), finiteNumber(value)].includes(true);
}

function finiteNumber(value: unknown): boolean {
  return typeof value === "number" && Number.isFinite(value);
}

export function isTableIdentifier(value: unknown): value is string {
  if (typeof value !== "string") return false;
  return [value.length > 0, value.length <= 128, !unsafeKeys.has(value)].every(Boolean);
}

function validateTableData(
  columns: readonly TableColumn[],
  rows: readonly TableRow[],
  constraint: CatalogTableDataConstraint,
  path: string,
  id: string | undefined,
  diagnostics: CompilerDiagnostic[]
): void {
  reportDuplicates(
    columns.map(({ key }) => key),
    constraint.columnsProperty,
    "key",
    DiagnosticCode.DuplicateTableColumnKey,
    path,
    id,
    diagnostics
  );
  reportDuplicates(
    rows.map(({ id: rowId }) => rowId),
    constraint.rowsProperty,
    "id",
    DiagnosticCode.DuplicateTableRowId,
    path,
    id,
    diagnostics
  );
  reportUnknownCells(columns, rows, constraint, path, id, diagnostics);
}

function reportDuplicates(
  values: readonly string[],
  property: string,
  field: string,
  code: DiagnosticCode,
  path: string,
  id: string | undefined,
  diagnostics: CompilerDiagnostic[]
): void {
  const seen = new Set<string>();
  values.forEach((value, index) => {
    if (seen.has(value))
      diagnostics.push(
        errorDiagnostic(
          code,
          `Table ${field} "${value}" is already defined.`,
          `${path}/${property}/${index}/${field}`,
          id
        )
      );
    seen.add(value);
  });
}

function reportUnknownCells(
  columns: readonly TableColumn[],
  rows: readonly TableRow[],
  constraint: CatalogTableDataConstraint,
  path: string,
  id: string | undefined,
  diagnostics: CompilerDiagnostic[]
): void {
  const keys = new Set(columns.map(({ key }) => key));
  rows.forEach((row, rowIndex) =>
    Object.keys(row.cells).forEach((key) => {
      if (!keys.has(key))
        diagnostics.push(
          errorDiagnostic(
            DiagnosticCode.UnknownTableCell,
            `Table cell "${key}" has no declared column.`,
            `${path}/${constraint.rowsProperty}/${rowIndex}/cells/${pointerToken(key)}`,
            id
          )
        );
    })
  );
}

function pointerToken(value: string): string {
  return value.replaceAll("~", "~0").replaceAll("/", "~1");
}

function nodeId(node: Readonly<Record<string, unknown>>): string | undefined {
  return typeof node["id"] === "string" ? node["id"] : undefined;
}

function readTableData(
  node: Readonly<Record<string, unknown>>,
  constraint: CatalogTableDataConstraint
): { columns: readonly TableColumn[]; rows: readonly TableRow[] } | undefined {
  const columns = node[constraint.columnsProperty];
  const rows = node[constraint.rowsProperty];
  if (!isTableColumnList(columns)) return undefined;
  if (!isTableRowList(rows)) return undefined;
  return { columns, rows };
}
