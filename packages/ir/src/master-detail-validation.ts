import {
  CatalogConstraintKind,
  type CatalogConstraintDescriptor,
  type CatalogMasterDetailStateConstraint,
  type TableColumn,
  type TableRow
} from "@unislang/unifold-catalog";

import { errorDiagnostic } from "./diagnostics.js";
import { DiagnosticCode } from "./enums.js";
import type { CompilerDiagnostic } from "./types.js";
import { isTableColumnList, isTableRowList } from "./table-data-validation.js";

export function validateMasterDetailStateConstraint(
  node: Readonly<Record<string, unknown>>,
  constraint: CatalogConstraintDescriptor,
  path: string,
  diagnostics: CompilerDiagnostic[]
): void {
  if (constraint.kind !== CatalogConstraintKind.MasterDetailState) return;
  const data = readState(node, constraint);
  if (data === undefined) return;
  validateMasterColumn(data.columns, data.masterColumn, constraint, node, path, diagnostics);
  validateSelection(data.rows, data.value, constraint, node, path, diagnostics);
}

interface MasterDetailState {
  readonly columns: readonly TableColumn[];
  readonly masterColumn: string;
  readonly rows: readonly TableRow[];
  readonly value: string;
}

function readState(
  node: Readonly<Record<string, unknown>>,
  constraint: CatalogMasterDetailStateConstraint
): MasterDetailState | undefined {
  const columns = node[constraint.columnsProperty];
  const rows = node[constraint.rowsProperty];
  const masterColumn = node[constraint.masterColumnProperty];
  const value = node[constraint.valueProperty];
  const data = readMasterDetailData(columns, rows);
  if (data === undefined) return undefined;
  const state = readStringState(masterColumn, value);
  if (state === undefined) return undefined;
  return { ...data, ...state };
}

function readMasterDetailData(
  columns: unknown,
  rows: unknown
): Pick<MasterDetailState, "columns" | "rows"> | undefined {
  if (!isTableColumnList(columns) || !isTableRowList(rows)) return undefined;
  return { columns, rows };
}

function readStringState(
  masterColumn: unknown,
  value: unknown
): Pick<MasterDetailState, "masterColumn" | "value"> | undefined {
  if (typeof masterColumn !== "string" || typeof value !== "string") return undefined;
  return { masterColumn, value };
}

function validateMasterColumn(
  columns: readonly TableColumn[],
  masterColumn: string,
  constraint: CatalogMasterDetailStateConstraint,
  node: Readonly<Record<string, unknown>>,
  path: string,
  diagnostics: CompilerDiagnostic[]
): void {
  if (columns.some(({ key }) => key === masterColumn)) return;
  diagnostics.push(
    errorDiagnostic(
      DiagnosticCode.UnknownMasterDetailColumn,
      `Master column "${masterColumn}" is not declared in the columns.`,
      `${path}/${constraint.masterColumnProperty}`,
      nodeId(node)
    )
  );
}

function validateSelection(
  rows: readonly TableRow[],
  value: string,
  constraint: CatalogMasterDetailStateConstraint,
  node: Readonly<Record<string, unknown>>,
  path: string,
  diagnostics: CompilerDiagnostic[]
): void {
  if (value === "" || rows.some(({ id }) => id === value)) return;
  diagnostics.push(
    errorDiagnostic(
      DiagnosticCode.UnknownMasterDetailSelection,
      `Selected master record "${value}" is not declared in the rows.`,
      `${path}/${constraint.valueProperty}`,
      nodeId(node)
    )
  );
}

function nodeId(node: Readonly<Record<string, unknown>>): string | undefined {
  return typeof node["id"] === "string" ? node["id"] : undefined;
}
