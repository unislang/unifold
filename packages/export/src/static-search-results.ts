import {
  getCoreDescriptor,
  MAXIMUM_SEARCH_QUERY_LENGTH,
  type SearchResult,
  type SearchResultsValue
} from "@unislang/unifold-catalog";
import { CoreComponentType, DataClassification, type JsonValue } from "@unislang/unifold-contracts";
import type { UnifoldIrDocument, UnifoldIrNode } from "@unislang/unifold-ir";

import { escapeHtml } from "./html-escape.js";

const STATIC_RESULT_LIMIT = 200;

interface StaticSearchResultsContext {
  readonly document: UnifoldIrDocument;
  readonly node: UnifoldIrNode;
}

export function renderStaticSearchResults({ document, node }: StaticSearchResultsContext): string {
  if (classification(document, node) !== DataClassification.Public) return emptyPrivateSearch();
  const results = resultProperty(node);
  const value = valueProperty(node);
  const visible = visibleResults(results, value.selectedResultId);
  const items = visible.map((result) => renderResult(result, value)).join("");
  const summary = renderSummary(results.length, visible.length);
  return `<section role="search"><label><span>${escapeHtml(textProperty(node, "label"))}</span><input type="search"${attribute("name", textProperty(node, "name"))}${attribute("maxlength", String(numberProperty(node, "maxLength")))}${attribute("placeholder", textProperty(node, "placeholder"))}${attribute("value", value.query)}></label><p role="status">${summary}</p><ol${attribute("aria-label", textProperty(node, "resultsLabel"))}>${items}</ol>${renderEmpty(node, results)}</section>`;
}

function emptyPrivateSearch(): string {
  return '<section role="search"><label><span></span><input type="search" aria-label="" value=""></label><p role="status"></p><ol aria-label=""></ol></section>';
}

function visibleResults(
  results: readonly SearchResult[],
  selectedResultId: string
): readonly SearchResult[] {
  const visible = results.slice(0, STATIC_RESULT_LIMIT);
  const selected = results.find(({ id }) => id === selectedResultId);
  if (selected === undefined || visible.includes(selected)) return visible;
  return [...visible, selected];
}

function renderResult(result: SearchResult, value: SearchResultsValue): string {
  const content = `<strong>${escapeHtml(result.title)}</strong>${renderDescription(result)}`;
  const resultContent =
    result.href === undefined ? content : `<a${attribute("href", result.href)}>${content}</a>`;
  const selected = result.id === value.selectedResultId ? ' aria-current="true"' : "";
  return `<li${selected}>${resultContent}</li>`;
}

function renderDescription(result: SearchResult): string {
  return result.description === undefined ? "" : `<p>${escapeHtml(result.description)}</p>`;
}

function renderSummary(total: number, visible: number): string {
  if (total <= STATIC_RESULT_LIMIT) return `${total} ${total === 1 ? "result" : "results"}`;
  return `${visible} of ${total} results`;
}

function renderEmpty(node: UnifoldIrNode, results: readonly SearchResult[]): string {
  return results.length === 0 ? `<p>${escapeHtml(textProperty(node, "emptyMessage"))}</p>` : "";
}

function resultProperty(node: UnifoldIrNode): readonly SearchResult[] {
  return property(node, "results") as unknown as readonly SearchResult[];
}

function valueProperty(node: UnifoldIrNode): SearchResultsValue {
  return property(node, "value") as unknown as SearchResultsValue;
}

function textProperty(node: UnifoldIrNode, name: string): string {
  const value = property(node, name);
  return typeof value === "string" ? value : "";
}

function numberProperty(node: UnifoldIrNode, name: string): number {
  const value = property(node, name);
  return typeof value === "number" ? value : MAXIMUM_SEARCH_QUERY_LENGTH;
}

function property(node: UnifoldIrNode, name: string): JsonValue | undefined {
  const value = node.properties[name];
  if (value !== undefined) return value;
  const descriptor = getCoreDescriptor(CoreComponentType.SearchResults);
  if (descriptor === undefined) return undefined;
  const candidate = descriptor.properties.find((property) => property.name === name);
  return propertyDefault(candidate);
}

function propertyDefault(
  candidate: { readonly defaultValue?: JsonValue } | undefined
): JsonValue | undefined {
  return candidate === undefined ? undefined : candidate.defaultValue;
}

function classification(document: UnifoldIrDocument, node: UnifoldIrNode): DataClassification {
  if (node.binding === undefined) return DataClassification.Public;
  const store = document.storesById[node.binding.store];
  return store === undefined ? DataClassification.NeverExport : store.classification;
}

function attribute(name: string, value: string): string {
  return ` ${name}="${escapeHtml(value)}"`;
}
