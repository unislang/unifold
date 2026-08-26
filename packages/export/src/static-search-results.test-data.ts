import { DataClassification, type JsonObject } from "@unislang/unifold-contracts";

import { documentWithView } from "./static-html.test-data.js";

export function largeSearchResultsDocument(count = 205): JsonObject {
  return documentWithView(searchResultsNode(count));
}

export function classifiedSearchResultsDocument(classification: DataClassification): JsonObject {
  return {
    ...documentWithView({
      ...searchResultsNode(2),
      path: "/search",
      store: "profile"
    }),
    stores: [storeDefinition(classification)]
  };
}

function searchResultsNode(count: number): JsonObject {
  return {
    $comp: "SearchResults",
    id: "search",
    label: "Search people",
    placeholder: "Name <script>",
    results: searchResults(count),
    resultsLabel: "People results",
    value: { query: "Ada <img>", selectedResultId: `result-${count - 1}` }
  };
}

function searchResults(count: number): readonly JsonObject[] {
  return Array.from({ length: count }, (_, index) => ({
    description: `<script>${index}</script>`,
    href: `/people/${index}`,
    id: `result-${index}`,
    title: `Person ${index}`
  }));
}

function storeDefinition(classification: DataClassification): JsonObject {
  return {
    access: "read-only",
    classification,
    id: "profile",
    initialData: "required",
    maxBytes: 65_536,
    migrations: { maximum: "2.9.0", minimum: "2.0.0" },
    ownership: "host",
    persistence: "session",
    schema: {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      additionalProperties: false,
      properties: {
        search: searchValueSchema()
      },
      required: ["search"],
      type: "object"
    },
    schemaVersion: "1.0.0",
    source: { kind: "host" }
  };
}

function searchValueSchema(): JsonObject {
  return {
    additionalProperties: false,
    properties: {
      query: { type: "string" },
      selectedResultId: { type: "string" }
    },
    required: ["query", "selectedResultId"],
    type: "object"
  };
}
