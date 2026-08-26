import type { JsonObject } from "@unislang/unifold-contracts";

export function searchResultsStoreDocument(): JsonObject {
  return {
    $schema: "https://schemas.unifold.org/ui-document/1.0/schema.json",
    catalog: { name: "unifold-core", version: "1.0.0" },
    compositions: [],
    id: "search-results-store",
    jsonUiProfile: {
      name: "unifold-jsonui",
      upstream: "5401b3d4900ca3032c108d6db00e8a819f4b28e9",
      version: "1.0.0"
    },
    revision: "1",
    schemaVersion: "1.0.0",
    stores: [storeDefinition()],
    view: searchResultsView()
  };
}

function searchResultsView(): JsonObject {
  return {
    $comp: "SearchResults",
    id: "customer-search",
    label: "Search customers",
    path: "/search",
    results: [
      { description: "Active", href: "/ada", id: "ada", title: "Ada" },
      { description: "Pending", href: "/grace", id: "grace", title: "Grace" }
    ],
    store: "customer"
  };
}

function storeDefinition(): JsonObject {
  return {
    access: "read-write-draft",
    classification: "internal",
    id: "customer",
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
      selectedResultId: { enum: ["ada", "grace", ""], type: "string" }
    },
    required: ["query", "selectedResultId"],
    type: "object"
  };
}
