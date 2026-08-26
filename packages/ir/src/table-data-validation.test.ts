import { CatalogConstraintKind, type CatalogTableDataConstraint } from "@unislang/unifold-catalog";
import { expect, it } from "vitest";

import { DiagnosticCode } from "./enums.js";
import {
  isTableColumnList,
  isTableRowList,
  validateTableDataConstraint
} from "./table-data-validation.js";
import type { CompilerDiagnostic } from "./types.js";

const constraint: CatalogTableDataConstraint = {
  columnsProperty: "columns",
  kind: CatalogConstraintKind.TableData,
  rowsProperty: "rows"
};

it("accepts bounded scalar table data", () => {
  const columns = [{ key: "name", label: "Name" }];
  const rows = [{ cells: { name: "Ada" }, id: "ada" }];
  expect(isTableColumnList(columns)).toBe(true);
  expect(isTableRowList(rows)).toBe(true);
  expect(validateTable(columns, rows)).toEqual([]);
});

it("rejects malformed, unsafe, and over-budget table shapes", () => {
  expect(isTableColumnList([])).toBe(false);
  expect(isTableColumnList([{ key: "__proto__", label: "Unsafe" }])).toBe(false);
  expect(isTableColumnList(Array.from({ length: 65 }, column))).toBe(false);
  expect(isTableRowList([{ cells: { name: [] }, id: "row" }])).toBe(false);
  expect(isTableRowList(Array.from({ length: 10_001 }, row))).toBe(false);
});

it("reports duplicate identities and undeclared cells at exact pointers", () => {
  const diagnostics = validateTable(
    [column(0), column(0)],
    [row(0), row(0), { cells: { "unknown/key": true }, id: "other" }]
  );
  expect(diagnostics.map(({ code, path }) => ({ code, path }))).toEqual([
    { code: DiagnosticCode.DuplicateTableColumnKey, path: "/view/columns/1/key" },
    { code: DiagnosticCode.DuplicateTableRowId, path: "/view/rows/1/id" },
    { code: DiagnosticCode.UnknownTableCell, path: "/view/rows/2/cells/unknown~1key" }
  ]);
});

function validateTable(columns: unknown, rows: unknown): CompilerDiagnostic[] {
  const diagnostics: CompilerDiagnostic[] = [];
  validateTableDataConstraint({ columns, id: "table", rows }, constraint, "/view", diagnostics);
  return diagnostics;
}

function column(index: number) {
  return { key: `column-${index}`, label: `Column ${index}` };
}

function row(index: number) {
  return { cells: { "column-0": `Value ${index}` }, id: `row-${index}` };
}
