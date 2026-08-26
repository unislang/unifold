import {
  CatalogConstraintKind,
  isSafeUrl,
  type CatalogConstraintDescriptor,
  type CatalogSearchResultsStateConstraint,
  type SearchResult,
  type SearchResultsValue
} from "@unislang/unifold-catalog";

import { errorDiagnostic } from "./diagnostics.js";
import { DiagnosticCode } from "./enums.js";
import { isPlainObject } from "./json-safety.js";
import { isTableIdentifier } from "./table-data-validation.js";
import type { CompilerDiagnostic } from "./types.js";

const MAX_RESULTS = 10_000;
const MAX_QUERY_LENGTH = 2_048;
const MAX_TITLE_LENGTH = 512;
const MAX_DESCRIPTION_LENGTH = 4_096;
const resultKeys = new Set(["description", "href", "id", "title"]);
const valueKeys = new Set(["query", "selectedResultId"]);

export function isSearchResultList(value: unknown): value is readonly SearchResult[] {
  return Array.isArray(value) && value.length <= MAX_RESULTS && value.every(isSearchResult);
}

export function isSearchResultsValue(value: unknown): value is SearchResultsValue {
  if (!isPlainObject(value)) return false;
  return [
    Object.keys(value).every((key) => valueKeys.has(key)),
    boundedString(value["query"], MAX_QUERY_LENGTH),
    value["selectedResultId"] === "" || isTableIdentifier(value["selectedResultId"])
  ].every(Boolean);
}

export function validateSearchResultsStateConstraint(
  node: Readonly<Record<string, unknown>>,
  constraint: CatalogConstraintDescriptor,
  path: string,
  diagnostics: CompilerDiagnostic[]
): void {
  if (constraint.kind !== CatalogConstraintKind.SearchResultsState) return;
  const state = readState(node, constraint);
  if (state === undefined) return;
  reportDuplicateIds(state.results, constraint, path, nodeId(node), diagnostics);
  reportUnknownSelection(state, constraint, path, nodeId(node), diagnostics);
}

interface SearchResultsState {
  readonly results: readonly SearchResult[];
  readonly value: SearchResultsValue;
}

function isSearchResult(value: unknown): value is SearchResult {
  if (!isPlainObject(value)) return false;
  return [
    Object.keys(value).every((key) => resultKeys.has(key)),
    isTableIdentifier(value["id"]),
    nonEmptyBoundedString(value["title"], MAX_TITLE_LENGTH),
    optionalBoundedString(value["description"], MAX_DESCRIPTION_LENGTH),
    optionalSafeUrl(value["href"])
  ].every(Boolean);
}

function nonEmptyBoundedString(value: unknown, maximum: number): boolean {
  return boundedString(value, maximum) && value.length > 0;
}

function boundedString(value: unknown, maximum: number): value is string {
  return typeof value === "string" && value.length <= maximum;
}

function optionalBoundedString(value: unknown, maximum: number): boolean {
  return value === undefined || boundedString(value, maximum);
}

function optionalSafeUrl(value: unknown): boolean {
  return value === undefined || (typeof value === "string" && isSafeUrl(value));
}

function readState(
  node: Readonly<Record<string, unknown>>,
  constraint: CatalogSearchResultsStateConstraint
): SearchResultsState | undefined {
  const results = node[constraint.resultsProperty];
  const value = defaultSearchValue(node[constraint.valueProperty]);
  if (!isSearchResultList(results)) return undefined;
  if (!isSearchResultsValue(value)) return undefined;
  return { results, value };
}

function defaultSearchValue(value: unknown): unknown {
  return value ?? { query: "", selectedResultId: "" };
}

function reportDuplicateIds(
  results: readonly SearchResult[],
  constraint: CatalogSearchResultsStateConstraint,
  path: string,
  id: string | undefined,
  diagnostics: CompilerDiagnostic[]
): void {
  const seen = new Set<string>();
  results.forEach((result, index) => {
    if (seen.has(result.id))
      diagnostics.push(
        errorDiagnostic(
          DiagnosticCode.DuplicateSearchResultId,
          `Search result id "${result.id}" is already defined.`,
          `${path}/${constraint.resultsProperty}/${index}/id`,
          id
        )
      );
    seen.add(result.id);
  });
}

function reportUnknownSelection(
  state: SearchResultsState,
  constraint: CatalogSearchResultsStateConstraint,
  path: string,
  id: string | undefined,
  diagnostics: CompilerDiagnostic[]
): void {
  const selected = state.value.selectedResultId;
  if (selected === "" || state.results.some((result) => result.id === selected)) return;
  diagnostics.push(
    errorDiagnostic(
      DiagnosticCode.UnknownSearchResultSelection,
      `Selected search result "${selected}" is not declared.`,
      `${path}/${constraint.valueProperty}/selectedResultId`,
      id
    )
  );
}

function nodeId(node: Readonly<Record<string, unknown>>): string | undefined {
  return typeof node["id"] === "string" ? node["id"] : undefined;
}
