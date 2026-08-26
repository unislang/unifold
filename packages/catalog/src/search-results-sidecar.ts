import { CoreComponentType } from "@unislang/unifold-contracts";

import { definition, exampleNode as node } from "./definition-sidecar-helpers.js";
import { ComponentAccessibilityPattern } from "./enums.js";
import type { ComponentDefinitionSidecar } from "./types.js";

export const searchResultsSidecar: ComponentDefinitionSidecar = definition({
  behaviors: [
    "Emits complete controlled query and selection snapshots",
    "Renders at most 200 result options from a 10,000-result collection",
    "Announces deterministic loading and result-count status"
  ],
  browserScenarios: ["queries and selects a virtualized search-results collection"],
  componentType: CoreComponentType.SearchResults,
  example: node(CoreComponentType.SearchResults, "customer-search", {
    label: "Search customers",
    results: [{ description: "Active account", href: "/customers/ada", id: "ada", title: "Ada" }],
    value: { query: "Ada", selectedResultId: "ada" }
  }),
  pattern: ComponentAccessibilityPattern.SearchResults,
  purpose:
    "Capture a controlled query and select one result from a bounded virtualized collection.",
  requirementIds: [
    "A11Y.SEARCH_RESULTS.FOCUS",
    "A11Y.SEARCH_RESULTS.STATUS",
    "EVENT.CONTROL.INPUT",
    "PERF.SEARCH_RESULTS.BOUNDED_DOM",
    "SECURITY.SEARCH_RESULTS.SAFE_URLS"
  ],
  semanticAttachmentPoints: [],
  sensitiveProperties: [
    "emptyMessage",
    "errorMessage",
    "label",
    "loadingMessage",
    "placeholder",
    "results",
    "resultsLabel",
    "value"
  ]
});
