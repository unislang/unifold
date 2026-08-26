import {
  CatalogConstraintKind,
  type CatalogMasterDetailStateConstraint
} from "@unislang/unifold-catalog";
import { expect, it } from "vitest";

import { DiagnosticCode } from "./enums.js";
import { validateMasterDetailStateConstraint } from "./master-detail-validation.js";
import type { CompilerDiagnostic } from "./types.js";

const constraint: CatalogMasterDetailStateConstraint = {
  columnsProperty: "columns",
  kind: CatalogConstraintKind.MasterDetailState,
  masterColumnProperty: "masterColumn",
  rowsProperty: "rows",
  valueProperty: "value"
};

const columns = [
  { key: "name", label: "Name" },
  { key: "status", label: "Status" }
];
const rows = [
  { cells: { name: "Ada", status: "Active" }, id: "ada" },
  { cells: { name: "Grace", status: "Pending" }, id: "grace" }
];

it("accepts a declared master column, row selection, and empty selection", () => {
  expect(validate({ value: "grace" })).toEqual([]);
  expect(validate({ value: "" })).toEqual([]);
});

it("reports unknown master columns and selections at exact pointers", () => {
  const diagnostics = validate({ masterColumn: "missing", value: "unknown" });
  expect(diagnostics.map(({ code, nodeId, path }) => ({ code, nodeId, path }))).toEqual([
    {
      code: DiagnosticCode.UnknownMasterDetailColumn,
      nodeId: "workspace",
      path: "/view/masterColumn"
    },
    {
      code: DiagnosticCode.UnknownMasterDetailSelection,
      nodeId: "workspace",
      path: "/view/value"
    }
  ]);
});

it("defers malformed table and scalar properties to property validation", () => {
  expect(validate({ columns: "invalid" })).toEqual([]);
  expect(validate({ rows: "invalid" })).toEqual([]);
  expect(validate({ value: 42 })).toEqual([]);
});

function validate(overrides: Readonly<Record<string, unknown>>): CompilerDiagnostic[] {
  const diagnostics: CompilerDiagnostic[] = [];
  validateMasterDetailStateConstraint(
    { columns, id: "workspace", masterColumn: "name", rows, value: "ada", ...overrides },
    constraint,
    "/view",
    diagnostics
  );
  return diagnostics;
}
