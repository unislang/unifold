import type { JsonObject } from "@unislang/unifold-contracts";

export function referenceSearchResultsNode(): JsonObject {
  return {
    $comp: "SearchResults",
    id: "people-search",
    label: "Search people",
    results: [
      { description: "Active account", href: "/people/ada", id: "ada-result", title: "Ada" }
    ],
    value: { query: "Ada", selectedResultId: "ada-result" }
  };
}
