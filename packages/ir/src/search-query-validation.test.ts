import { CatalogConstraintKind } from "@unislang/unifold-catalog";
import { expect, it } from "vitest";

import { validateSearchQueryLengthConstraint } from "./search-query-validation.js";
import type { CompilerDiagnostic } from "./types.js";

it("bounds scalar and nested search queries with one shared constraint", () => {
  expect(paths({ maxLength: 4, value: "12345" }, null)).toEqual(["/view/value"]);
  expect(paths({ maxLength: 4, value: { query: "12345" } }, "query")).toEqual([
    "/view/value/query"
  ]);
  expect(paths({ maxLength: 4, value: "1234" }, null)).toEqual([]);
});

it("rejects a maxLength above the framework query bound", () => {
  expect(paths({ maxLength: 2_049, value: "query" }, null)).toEqual(["/view/maxLength"]);
});

function paths(
  node: Readonly<Record<string, unknown>>,
  queryProperty: string | null
): readonly string[] {
  const diagnostics: CompilerDiagnostic[] = [];
  validateSearchQueryLengthConstraint(
    { id: "query", ...node },
    {
      kind: CatalogConstraintKind.SearchQueryLength,
      maximumProperty: "maxLength",
      queryProperty,
      valueProperty: "value"
    },
    "/view",
    diagnostics
  );
  return diagnostics.map(({ path }) => path);
}
