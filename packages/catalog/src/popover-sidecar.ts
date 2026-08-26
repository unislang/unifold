import { CoreComponentType } from "@unislang/unifold-contracts";

import { definition, exampleNode } from "./definition-sidecar-helpers.js";
import { ComponentAccessibilityPattern } from "./definition-enums.js";
import { TooltipPlacement } from "./enums.js";
import type { ComponentDefinitionSidecar } from "./types.js";

export const popoverSidecar: ComponentDefinitionSidecar = definition({
  behaviors: [
    "Keeps temporary disclosure state interaction-local",
    "Moves focus into the labeled surface and restores the trigger on Escape",
    "Closes on trigger activation, Escape, focus departure, native light dismissal, or outside pointer",
    "Uses the native Popover API progressively with a deterministic bounded fallback"
  ],
  browserScenarios: ["opens interactive JSON content and restores focus without losing identity"],
  componentType: CoreComponentType.Popover,
  example: exampleNode(CoreComponentType.Popover, "account-details", {
    $children: [
      exampleNode(CoreComponentType.Text, "account-summary", { content: "Account is active." })
    ],
    label: "Account details",
    panelLabel: "Current account details",
    placement: TooltipPlacement.Bottom
  }),
  pattern: ComponentAccessibilityPattern.Popover,
  purpose: "Reveal bounded interactive JSON-authored content from one labeled trigger.",
  requirementIds: [
    "A11Y.POPOVER.LABEL",
    "A11Y.POPOVER.FOCUS",
    "A11Y.POPOVER.DISMISS",
    "OVERLAY.POPOVER.PROGRESSIVE_NATIVE"
  ],
  semanticAttachmentPoints: [],
  sensitiveProperties: ["label", "panelLabel"]
});
