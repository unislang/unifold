import { CoreComponentType } from "@unislang/unifold-contracts";

import { definition, exampleNode } from "./definition-sidecar-helpers.js";
import {
  ComponentAccessibilityPattern,
  ComponentSemanticAttachmentKind,
  ComponentSemanticHiddenContentPolicy,
  ComponentSemanticNormalization,
  ComponentSemanticValueSource
} from "./definition-enums.js";
import { PaginationItemKind } from "./enums.js";
import type { ComponentDefinitionSidecar } from "./types.js";

export const paginationSidecar: ComponentDefinitionSidecar = definition({
  behaviors: [
    "Uses a labelled native navigation landmark and ordered list",
    "Marks exactly one authored page item as the current page",
    "Keeps disabled and overflow items noninteractive",
    "Preserves safe native navigation while emitting stable item identity and kind"
  ],
  browserScenarios: ["navigates explicit Pagination items through one canonical event stream"],
  componentType: CoreComponentType.Pagination,
  example: exampleNode(CoreComponentType.Pagination, "results-pagination", {
    items: [
      {
        accessibleLabel: "Previous results page",
        disabled: true,
        id: "previous",
        kind: PaginationItemKind.Previous,
        label: "Previous"
      },
      {
        accessibleLabel: "Results page 1, current page",
        current: true,
        href: "?page=1",
        id: "page-1",
        kind: PaginationItemKind.Page,
        label: "1"
      },
      {
        accessibleLabel: "Next results page",
        href: "?page=2",
        id: "next",
        kind: PaginationItemKind.Next,
        label: "Next"
      }
    ],
    label: "Results pages"
  }),
  pattern: ComponentAccessibilityPattern.PaginationNavigation,
  purpose: "Navigate a bounded, explicitly authored sequence of pages without hidden window logic.",
  requirementIds: [
    "A11Y.PAGINATION.LANDMARK",
    "A11Y.PAGINATION.CURRENT_PAGE",
    "EVENT.COMPONENT.ACTIVATED",
    "SEMANTICS.PAGINATION.ORDER"
  ],
  semanticAttachmentPoints: [
    {
      hiddenContent: ComponentSemanticHiddenContentPolicy.Prohibited,
      id: "items",
      kind: ComponentSemanticAttachmentKind.OrderedCollectionPosition,
      normalization: ComponentSemanticNormalization.None,
      sourceProperty: "items",
      valueSource: ComponentSemanticValueSource.PublicProperty
    }
  ],
  sensitiveProperties: ["items", "label"]
});
