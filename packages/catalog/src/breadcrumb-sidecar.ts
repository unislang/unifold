import { CoreComponentType } from "@unislang/unifold-contracts";

import { definition, exampleNode } from "./definition-sidecar-helpers.js";
import {
  ComponentAccessibilityPattern,
  ComponentSemanticAttachmentKind,
  ComponentSemanticHiddenContentPolicy,
  ComponentSemanticNormalization,
  ComponentSemanticValueSource
} from "./definition-enums.js";
import { BreadcrumbSeparator } from "./enums.js";
import type { ComponentDefinitionSidecar } from "./types.js";

export const breadcrumbSidecar: ComponentDefinitionSidecar = definition({
  behaviors: [
    "Uses a labelled native navigation landmark and ordered list",
    "Marks the final location as the current page",
    "Preserves native safe-link navigation while emitting canonical activation evidence"
  ],
  browserScenarios: ["navigates a semantic Breadcrumb and recovers without losing identity"],
  componentType: CoreComponentType.Breadcrumb,
  example: exampleNode(CoreComponentType.Breadcrumb, "account-breadcrumb", {
    items: [
      { href: "/", id: "home", label: "Home" },
      { href: "/accounts", id: "accounts", label: "Accounts" },
      { id: "current", label: "Current account" }
    ],
    label: "Account breadcrumb",
    separator: BreadcrumbSeparator.Chevron
  }),
  pattern: ComponentAccessibilityPattern.Breadcrumb,
  purpose: "Expose the current location and its ordered safe navigation hierarchy.",
  requirementIds: [
    "A11Y.BREADCRUMB.LANDMARK",
    "A11Y.BREADCRUMB.CURRENT_PAGE",
    "EVENT.COMPONENT.ACTIVATED",
    "SEMANTICS.BREADCRUMB.ORDER"
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
