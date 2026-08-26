import {
  CatalogConstraintKind,
  DataGridSelectionMode,
  DataGridSortDirection,
  type CatalogConstraintDescriptor,
  type CatalogDataGridStateConstraint,
  type DataGridValue,
  type TableColumn,
  type TableRow
} from "@unislang/unifold-catalog";

import { errorDiagnostic } from "./diagnostics.js";
import { DiagnosticCode } from "./enums.js";
import { isPlainObject } from "./json-safety.js";
import { isTableColumnList, isTableIdentifier, isTableRowList } from "./table-data-validation.js";
import type { CompilerDiagnostic } from "./types.js";

const sortKeys = new Set(["direction", "key"]);
const valueKeys = new Set(["selectedRowIds", "sort"]);
const MAX_SELECTED_ROWS = 10_000;

interface DataGridState {
  readonly columns: readonly TableColumn[];
  readonly rows: readonly TableRow[];
  readonly selectionMode: DataGridSelectionMode;
  readonly sortableColumns: readonly string[];
  readonly value: DataGridValue;
}

export function isDataGridValue(value: unknown): value is DataGridValue {
  if (!isPlainObject(value)) return false;
  return [
    Object.keys(value).every((key) => valueKeys.has(key)),
    isSelectedRowIds(value["selectedRowIds"]),
    value["sort"] === undefined || isSort(value["sort"])
  ].every(Boolean);
}

export function validateDataGridStateConstraint(
  node: Readonly<Record<string, unknown>>,
  constraint: CatalogConstraintDescriptor,
  path: string,
  diagnostics: CompilerDiagnostic[]
): void {
  if (constraint.kind !== CatalogConstraintKind.DataGridState) return;
  const state = readState(node, constraint);
  if (state === undefined) return;
  validateSortableColumns(state, constraint, nodeId(node), path, diagnostics);
  validateSelection(state, constraint, nodeId(node), path, diagnostics);
  validateSort(state, constraint, nodeId(node), path, diagnostics);
}

function isIdentifierArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every(isTableIdentifier);
}

function isSelectedRowIds(value: unknown): value is readonly string[] {
  return isIdentifierArray(value) && value.length <= MAX_SELECTED_ROWS;
}

function isSort(value: unknown): boolean {
  if (!isPlainObject(value)) return false;
  return [
    Object.keys(value).every((key) => sortKeys.has(key)),
    isTableIdentifier(value["key"]),
    Object.values(DataGridSortDirection).includes(value["direction"] as DataGridSortDirection)
  ].every(Boolean);
}

function readState(
  node: Readonly<Record<string, unknown>>,
  constraint: CatalogDataGridStateConstraint
): DataGridState | undefined {
  const columns = node[constraint.columnsProperty];
  const rows = node[constraint.rowsProperty];
  const selectionMode = defaultSelectionMode(node[constraint.selectionModeProperty]);
  const sortableColumns = defaultSortableColumns(node[constraint.sortableColumnsProperty]);
  const value = defaultValue(node[constraint.valueProperty]);
  const valid = [
    isTableColumnList(columns),
    isTableRowList(rows),
    isSelectionMode(selectionMode),
    isIdentifierArray(sortableColumns),
    isDataGridValue(value)
  ].every(Boolean);
  if (!valid) return undefined;
  return {
    columns: columns as readonly TableColumn[],
    rows: rows as readonly TableRow[],
    selectionMode: selectionMode as DataGridSelectionMode,
    sortableColumns: sortableColumns as readonly string[],
    value: value as DataGridValue
  };
}

function defaultSelectionMode(value: unknown): unknown {
  return value ?? DataGridSelectionMode.None;
}

function defaultSortableColumns(value: unknown): unknown {
  return value ?? [];
}

function defaultValue(value: unknown): unknown {
  return value ?? { selectedRowIds: [] };
}

function isSelectionMode(value: unknown): value is DataGridSelectionMode {
  return Object.values(DataGridSelectionMode).includes(value as DataGridSelectionMode);
}

function validateSortableColumns(
  state: DataGridState,
  constraint: CatalogDataGridStateConstraint,
  id: string | undefined,
  path: string,
  diagnostics: CompilerDiagnostic[]
): void {
  const declared = new Set(state.columns.map(({ key }) => key));
  reportStringDuplicates(
    state.sortableColumns,
    `${path}/${constraint.sortableColumnsProperty}`,
    DiagnosticCode.DuplicateDataGridSortableColumn,
    "Sortable column",
    id,
    diagnostics
  );
  state.sortableColumns.forEach((key, index) => {
    if (!declared.has(key))
      diagnostics.push(
        errorDiagnostic(
          DiagnosticCode.UnknownDataGridSortableColumn,
          `Sortable column "${key}" is not declared.`,
          `${path}/${constraint.sortableColumnsProperty}/${index}`,
          id
        )
      );
  });
}

function validateSelection(
  state: DataGridState,
  constraint: CatalogDataGridStateConstraint,
  id: string | undefined,
  path: string,
  diagnostics: CompilerDiagnostic[]
): void {
  const selectionPath = `${path}/${constraint.valueProperty}/selectedRowIds`;
  reportStringDuplicates(
    state.value.selectedRowIds,
    selectionPath,
    DiagnosticCode.DuplicateDataGridSelection,
    "Selected row",
    id,
    diagnostics
  );
  reportUnknownSelections(state, selectionPath, id, diagnostics);
  if (!validSelectionCount(state.selectionMode, state.value.selectedRowIds.length))
    diagnostics.push(
      errorDiagnostic(
        DiagnosticCode.InvalidDataGridSelectionCount,
        `Selection mode "${state.selectionMode}" does not allow ${state.value.selectedRowIds.length} selected rows.`,
        selectionPath,
        id
      )
    );
}

function reportUnknownSelections(
  state: DataGridState,
  path: string,
  id: string | undefined,
  diagnostics: CompilerDiagnostic[]
): void {
  const rows = new Set(state.rows.map(({ id: rowId }) => rowId));
  state.value.selectedRowIds.forEach((rowId, index) => {
    if (!rows.has(rowId))
      diagnostics.push(
        errorDiagnostic(
          DiagnosticCode.UnknownDataGridSelection,
          `Selected row "${rowId}" is not declared.`,
          `${path}/${index}`,
          id
        )
      );
  });
}

function validSelectionCount(mode: DataGridSelectionMode, count: number): boolean {
  if (mode === DataGridSelectionMode.None) return count === 0;
  if (mode === DataGridSelectionMode.Single) return count <= 1;
  return true;
}

function validateSort(
  state: DataGridState,
  constraint: CatalogDataGridStateConstraint,
  id: string | undefined,
  path: string,
  diagnostics: CompilerDiagnostic[]
): void {
  const sort = state.value.sort;
  if (sort === undefined) return;
  const keyPath = `${path}/${constraint.valueProperty}/sort/key`;
  if (reportUnknownSort(state, sort.key, keyPath, id, diagnostics)) return;
  reportUnsortableSort(state, sort.key, keyPath, id, diagnostics);
}

function reportUnknownSort(
  state: DataGridState,
  key: string,
  path: string,
  id: string | undefined,
  diagnostics: CompilerDiagnostic[]
): boolean {
  if (state.columns.some((column) => column.key === key)) return false;
  diagnostics.push(
    errorDiagnostic(
      DiagnosticCode.UnknownDataGridSortColumn,
      `Sort column "${key}" is not declared.`,
      path,
      id
    )
  );
  return true;
}

function reportUnsortableSort(
  state: DataGridState,
  key: string,
  path: string,
  id: string | undefined,
  diagnostics: CompilerDiagnostic[]
): void {
  if (!state.sortableColumns.includes(key))
    diagnostics.push(
      errorDiagnostic(
        DiagnosticCode.UnsortableDataGridSortColumn,
        `Column "${key}" is not sortable.`,
        path,
        id
      )
    );
}

function reportStringDuplicates(
  values: readonly string[],
  path: string,
  code: DiagnosticCode,
  label: string,
  id: string | undefined,
  diagnostics: CompilerDiagnostic[]
): void {
  const seen = new Set<string>();
  values.forEach((value, index) => {
    if (seen.has(value))
      diagnostics.push(
        errorDiagnostic(code, `${label} "${value}" is duplicated.`, `${path}/${index}`, id)
      );
    seen.add(value);
  });
}

function nodeId(node: Readonly<Record<string, unknown>>): string | undefined {
  return typeof node["id"] === "string" ? node["id"] : undefined;
}
