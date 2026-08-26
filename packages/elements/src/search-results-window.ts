import type { SearchResult } from "@unislang/unifold-catalog";

export const MAX_RENDERED_SEARCH_RESULTS = 200;

interface SearchResultsWindowInput {
  readonly activeIndex: number;
  readonly itemHeight: number;
  readonly overscan: number;
  readonly results: readonly SearchResult[];
  readonly scrollTop: number;
  readonly viewportHeight: number;
}

export interface SearchResultsWindow {
  readonly end: number;
  readonly results: readonly SearchResult[];
  readonly start: number;
}

export function resultWindow(input: SearchResultsWindowInput): SearchResultsWindow {
  const visible = Math.ceil(input.viewportHeight / input.itemHeight);
  const count = Math.min(MAX_RENDERED_SEARCH_RESULTS, visible + input.overscan * 2);
  const initial = Math.max(0, Math.floor(input.scrollTop / input.itemHeight) - input.overscan);
  const end = Math.min(input.results.length, initial + count);
  const start = Math.max(0, end - count);
  return { end, results: input.results.slice(start, end), start };
}

export function preferredResultIndex(
  results: readonly SearchResult[],
  selectedResultId: string,
  previousId = ""
): number {
  const candidates = [selectedResultId, previousId].map((id) => resultIndex(results, id));
  return candidates.find((index) => index >= 0) ?? defaultResultIndex(results);
}

function resultIndex(results: readonly SearchResult[], id: string): number {
  return results.findIndex((result) => result.id === id);
}

function defaultResultIndex(results: readonly SearchResult[]): number {
  return results.length === 0 ? -1 : 0;
}

export function nextResultIndex(length: number, current: number, delta: number): number {
  if (length === 0) return -1;
  return (current + delta + length) % length;
}

export function resultScrollTop(
  input: SearchResultsWindowInput,
  window: SearchResultsWindow
): number {
  if (input.activeIndex < window.start) return input.activeIndex * input.itemHeight;
  if (input.activeIndex >= window.end)
    return (input.activeIndex - (window.end - window.start) + 1) * input.itemHeight;
  return input.scrollTop;
}
