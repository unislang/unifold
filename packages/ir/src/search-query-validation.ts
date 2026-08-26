import {
  CatalogConstraintKind,
  MAXIMUM_SEARCH_QUERY_LENGTH,
  type CatalogConstraintDescriptor,
  type CatalogSearchQueryLengthConstraint
} from "@unislang/unifold-catalog";

import { errorDiagnostic } from "./diagnostics.js";
import { DiagnosticCode } from "./enums.js";
import { isPlainObject } from "./json-safety.js";
import type { CompilerDiagnostic } from "./types.js";

export function validateSearchQueryLengthConstraint(
  node: Readonly<Record<string, unknown>>,
  descriptor: CatalogConstraintDescriptor,
  path: string,
  diagnostics: CompilerDiagnostic[]
): void {
  if (descriptor.kind !== CatalogConstraintKind.SearchQueryLength) return;
  validateTypedSearchQuery(node, descriptor, path, diagnostics);
}

function validateTypedSearchQuery(
  node: Readonly<Record<string, unknown>>,
  descriptor: CatalogSearchQueryLengthConstraint,
  path: string,
  diagnostics: CompilerDiagnostic[]
): void {
  const maximum = queryMaximum(node[descriptor.maximumProperty]);
  if (maximum === undefined) {
    addMaximumDiagnostic(node, descriptor, path, diagnostics);
    return;
  }
  validateQueryValue(node, descriptor, maximum, path, diagnostics);
}

function validateQueryValue(
  node: Readonly<Record<string, unknown>>,
  descriptor: CatalogSearchQueryLengthConstraint,
  maximum: number,
  path: string,
  diagnostics: CompilerDiagnostic[]
): void {
  const query = searchQuery(node[descriptor.valueProperty], descriptor.queryProperty);
  if (query === undefined) return;
  if (query.length <= maximum) return;
  addQueryDiagnostic(node, descriptor, path, diagnostics);
}

function queryMaximum(value: unknown): number | undefined {
  if (value === undefined) return MAXIMUM_SEARCH_QUERY_LENGTH;
  return validQueryMaximum(value) ? value : undefined;
}

function validQueryMaximum(value: unknown): value is number {
  return [
    Number.isSafeInteger(value),
    Number(value) > 0,
    Number(value) <= MAXIMUM_SEARCH_QUERY_LENGTH
  ].every(Boolean);
}

function searchQuery(value: unknown, property: string | null): string | undefined {
  if (property === null) return stringValue(value);
  return objectQuery(value, property);
}

function objectQuery(value: unknown, property: string): string | undefined {
  if (!isPlainObject(value)) return undefined;
  return stringValue(value[property]);
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function addMaximumDiagnostic(
  node: Readonly<Record<string, unknown>>,
  descriptor: CatalogSearchQueryLengthConstraint,
  path: string,
  diagnostics: CompilerDiagnostic[]
): void {
  diagnostics.push(
    errorDiagnostic(
      DiagnosticCode.InvalidProperty,
      `Search maxLength must not exceed ${MAXIMUM_SEARCH_QUERY_LENGTH}.`,
      `${path}/${descriptor.maximumProperty}`,
      nodeId(node)
    )
  );
}

function addQueryDiagnostic(
  node: Readonly<Record<string, unknown>>,
  descriptor: CatalogSearchQueryLengthConstraint,
  path: string,
  diagnostics: CompilerDiagnostic[]
): void {
  diagnostics.push(
    errorDiagnostic(
      DiagnosticCode.InvalidProperty,
      "Search query exceeds the declared maxLength.",
      queryPath(path, descriptor),
      nodeId(node)
    )
  );
}

function queryPath(path: string, descriptor: CatalogSearchQueryLengthConstraint): string {
  const valuePath = `${path}/${descriptor.valueProperty}`;
  return descriptor.queryProperty === null ? valuePath : `${valuePath}/${descriptor.queryProperty}`;
}

function nodeId(node: Readonly<Record<string, unknown>>): string | undefined {
  return typeof node["id"] === "string" ? node["id"] : undefined;
}
