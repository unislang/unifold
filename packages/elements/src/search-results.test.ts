// @vitest-environment happy-dom
import type { SearchResult, SearchResultsValue } from "@unislang/unifold-catalog";
import { expect, it, vi } from "vitest";

import { controlNode } from "./elements.test-data.js";
import { ElementEventName } from "./index.js";
import { defineUnifoldSearchResults, UnifoldSearchResults } from "./search-results-entry.js";

it("emits complete controlled query and keyboard selection snapshots", async () => {
  const search = configuredSearch();
  const events = vi.fn();
  search.addEventListener(ElementEventName.UiEvent, events);
  document.body.append(search);
  await search.updateComplete;

  const input = requireInput(search);
  input.value = "Grace";
  input.dispatchEvent(new Event("input"));
  await search.updateComplete;
  expect(search.value).toEqual({ query: "Grace", selectedResultId: "" });

  const viewport = requireViewport(search);
  viewport.focus();
  viewport.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown" }));
  viewport.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
  await search.updateComplete;

  expect(search.value).toEqual({ query: "Grace", selectedResultId: "result-00001" });
  expect(events).toHaveBeenCalledTimes(2);
  const detail = events.mock.calls[1]?.[0].detail;
  expect(detail.data.change).toEqual({
    value: { query: "Grace", selectedResultId: "result-00001" }
  });
  expect(detail.data.snapshot.control.value).toEqual(search.value);
  expect(detail.data.snapshot.properties.results).toHaveLength(10_000);
  expect(search.shadowRoot?.activeElement).toBe(viewport);
});

it("bounds 10k hostile results and preserves text-only rendering", async () => {
  const search = configuredSearch();
  Object.assign(search, { itemHeight: 1, overscan: 100, viewportHeight: 1_000 });
  document.body.append(search);
  await search.updateComplete;

  const root = search.shadowRoot as ShadowRoot;
  expect(root.querySelectorAll("[role=option]")).toHaveLength(200);
  expect(root.textContent).toContain('<img src=x onerror="alert(1)">');
  expect(root.querySelector("img")).toBeNull();
  expect(requireViewport(search).getAttribute("aria-setsize")).toBeNull();
  expect(root.querySelector("[role=option]")?.getAttribute("aria-setsize")).toBe("10000");
});

it("announces loading, count, empty, and error states deterministically", async () => {
  const search = configuredSearch();
  search.loading = true;
  search.errorMessage = "Try again";
  document.body.append(search);
  await search.updateComplete;
  expect(statusText(search)).toBe("Fetching people");
  expect(requireViewport(search).getAttribute("aria-busy")).toBe("true");
  expect(requireElement(search, '[role="alert"]').textContent).toBe("Try again");

  search.loading = false;
  search.results = [];
  search.value = { query: "nobody", selectedResultId: "" };
  await search.updateComplete;
  expect(statusText(search)).toBe("0 results");
  expect(requireElement(search, '[part="empty"]').textContent).toBe("No people");
});

it("projects and enforces the shared native search-query bound", async () => {
  const search = configuredSearch();
  search.maxLength = 4;
  document.body.append(search);
  await search.updateComplete;
  const input = requireInput(search);
  expect(input.maxLength).toBe(4);
  input.value = "longer";
  input.dispatchEvent(new Event("input"));
  expect(search.value.query).toBe("Ada");
  expect(input.value).toBe("Ada");
});

function configuredSearch(): UnifoldSearchResults {
  defineUnifoldSearchResults();
  const search = document.createElement("unifold-search-results") as UnifoldSearchResults;
  const value: SearchResultsValue = { query: "Ada", selectedResultId: "result-00000" };
  Object.assign(search, {
    emptyMessage: "No people",
    id: "people-search",
    itemHeight: 72,
    label: "Search people",
    loadingMessage: "Fetching people",
    results: results(10_000),
    resultsLabel: "People results",
    value,
    viewportHeight: 480
  });
  search.eventNode = controlNode("people-search", value, undefined, "SearchResults");
  return search;
}

function results(count: number): readonly SearchResult[] {
  return Array.from({ length: count }, (_, index) => ({
    description: `<img src=x onerror="alert(1)"> ${index}`,
    href: `/people/${index}`,
    id: `result-${String(index).padStart(5, "0")}`,
    title: `Person ${index}`
  }));
}

function requireInput(search: UnifoldSearchResults): HTMLInputElement {
  const input = search.shadowRoot?.querySelector<HTMLInputElement>('input[type="search"]');
  if (!(input instanceof HTMLInputElement)) throw new Error("Search input is missing.");
  return input;
}

function requireViewport(search: UnifoldSearchResults): HTMLElement {
  const viewport = search.shadowRoot?.querySelector<HTMLElement>("[part=viewport]");
  if (!(viewport instanceof HTMLElement)) throw new Error("Search viewport is missing.");
  return viewport;
}

function statusText(search: UnifoldSearchResults): string {
  return requireElement(search, '[role="status"]').textContent ?? "";
}

function requireElement(search: UnifoldSearchResults, selector: string): Element {
  const root = search.shadowRoot;
  if (root === null) throw new Error("SearchResults shadow root is missing.");
  const element = root.querySelector(selector);
  if (element === null) throw new Error(`Missing ${selector}.`);
  return element;
}
