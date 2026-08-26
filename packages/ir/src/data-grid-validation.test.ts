import {
  CatalogConstraintKind,
  DataGridSelectionMode,
  type CatalogDataGridStateConstraint
} from "@unislang/unifold-catalog";
import { expect, it } from "vitest";

import { isDataGridValue, validateDataGridStateConstraint } from "./data-grid-validation.js";
import { DiagnosticCode } from "./enums.js";
import type { CompilerDiagnostic } from "./types.js";

const constraint: CatalogDataGridStateConstraint = {
  columnsProperty: "columns",
  kind: CatalogConstraintKind.DataGridState,
  rowsProperty: "rows",
  selectionModeProperty: "selectionMode",
  sortableColumnsProperty: "sortableColumns",
  valueProperty: "value"
};

const columns = [
  { key: "name", label: "Name" },
  { key: "age", label: "Age" }
];
const rows = [
  { cells: { age: 37, name: "Ada" }, id: "ada" },
  { cells: { age: 41, name: "Grace" }, id: "grace" }
];

it("accepts strict composite DataGrid values and consistent state", () => {
  const value = {
    selectedRowIds: ["ada"],
    sort: { direction: "ascending" as const, key: "name" }
  };
  expect(isDataGridValue(value)).toBe(true);
  expect(validate({ selectionMode: DataGridSelectionMode.Single, value })).toEqual([]);
});

it("rejects malformed composite values", () => {
  expect(isDataGridValue({ selectedRowIds: [], surprise: true })).toBe(false);
  expect(isDataGridValue({ selectedRowIds: ["__proto__"] })).toBe(false);
  expect(
    isDataGridValue({ selectedRowIds: Array.from({ length: 10_001 }, (_, index) => `r${index}`) })
  ).toBe(false);
  expect(
    isDataGridValue({ selectedRowIds: [], sort: { direction: "sideways", key: "name" } })
  ).toBe(false);
  expect(
    isDataGridValue({ selectedRowIds: [], sort: { direction: "ascending", key: "name", x: 1 } })
  ).toBe(false);
});

it("reports duplicate, unknown, cardinality, and sort failures at exact pointers", () => {
  const diagnostics = validate({
    selectionMode: DataGridSelectionMode.Single,
    sortableColumns: ["name", "name", "missing"],
    value: {
      selectedRowIds: ["ada", "ada", "missing"],
      sort: { direction: "descending", key: "age" }
    }
  });
  expect(diagnostics.map(({ code, path }) => ({ code, path }))).toEqual([
    {
      code: DiagnosticCode.DuplicateDataGridSortableColumn,
      path: "/view/sortableColumns/1"
    },
    {
      code: DiagnosticCode.UnknownDataGridSortableColumn,
      path: "/view/sortableColumns/2"
    },
    { code: DiagnosticCode.DuplicateDataGridSelection, path: "/view/value/selectedRowIds/1" },
    { code: DiagnosticCode.UnknownDataGridSelection, path: "/view/value/selectedRowIds/2" },
    {
      code: DiagnosticCode.InvalidDataGridSelectionCount,
      path: "/view/value/selectedRowIds"
    },
    { code: DiagnosticCode.UnsortableDataGridSortColumn, path: "/view/value/sort/key" }
  ]);
});

it("distinguishes undeclared sort columns and none-mode selections", () => {
  const unknownSort = validate({
    selectionMode: DataGridSelectionMode.None,
    value: {
      selectedRowIds: ["ada"],
      sort: { direction: "ascending", key: "missing" }
    }
  });
  expect(unknownSort.map(({ code }) => code)).toEqual([
    DiagnosticCode.InvalidDataGridSelectionCount,
    DiagnosticCode.UnknownDataGridSortColumn
  ]);
});

function validate(overrides: Readonly<Record<string, unknown>>): CompilerDiagnostic[] {
  const diagnostics: CompilerDiagnostic[] = [];
  validateDataGridStateConstraint(
    {
      columns,
      id: "grid",
      rows,
      selectionMode: DataGridSelectionMode.Multiple,
      sortableColumns: ["name"],
      value: { selectedRowIds: [] },
      ...overrides
    },
    constraint,
    "/view",
    diagnostics
  );
  return diagnostics;
}
