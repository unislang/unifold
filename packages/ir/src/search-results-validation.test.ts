import {
  CatalogConstraintKind,
  type CatalogSearchResultsStateConstraint
} from "@unislang/unifold-catalog";
import { expect, it } from "vitest";

import { DiagnosticCode } from "./enums.js";
import {
  isSearchResultList,
  isSearchResultsValue,
  validateSearchResultsStateConstraint
} from "./search-results-validation.js";
import type { CompilerDiagnostic } from "./types.js";

const constraint: CatalogSearchResultsStateConstraint = {
  kind: CatalogConstraintKind.SearchResultsState,
  resultsProperty: "results",
  valueProperty: "value"
};

it("accepts bounded safe results and controlled state", () => {
  expect(
    isSearchResultList([{ description: "Profile", href: "/people/ada", id: "ada", title: "Ada" }])
  ).toBe(true);
  expect(isSearchResultsValue({ query: "ada", selectedResultId: "ada" })).toBe(true);
  expect(validateNode()).toEqual([]);
});

it("rejects malformed, oversized, executable, and extra result data", () => {
  expect(isSearchResultList(Array.from({ length: 10_001 }, result))).toBe(false);
  expect(isSearchResultList([{ href: "javascript:alert(1)", id: "x", title: "X" }])).toBe(false);
  expect(isSearchResultList([{ id: "x", secret: "leak", title: "X" }])).toBe(false);
  expect(isSearchResultsValue({ query: "x".repeat(2_049), selectedResultId: "" })).toBe(false);
});

it("reports duplicate ids and an unknown selected result at exact pointers", () => {
  const diagnostics = validateNode({
    results: [result(0), result(0)],
    value: { query: "Ada", selectedResultId: "missing" }
  });
  expect(diagnostics.map(({ code, path }) => ({ code, path }))).toEqual([
    { code: DiagnosticCode.DuplicateSearchResultId, path: "/view/results/1/id" },
    {
      code: DiagnosticCode.UnknownSearchResultSelection,
      path: "/view/value/selectedResultId"
    }
  ]);
});

function validateNode(changes: Readonly<Record<string, unknown>> = {}): CompilerDiagnostic[] {
  const diagnostics: CompilerDiagnostic[] = [];
  validateSearchResultsStateConstraint(
    {
      id: "search",
      results: [result(0)],
      value: { query: "Ada", selectedResultId: "ada-0" },
      ...changes
    },
    constraint,
    "/view",
    diagnostics
  );
  return diagnostics;
}

function result(index: number) {
  return { description: `Person ${index}`, id: `ada-${index}`, title: `Ada ${index}` };
}
