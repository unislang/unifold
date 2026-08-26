import { CoreComponentType } from "@unislang/unifold-contracts";

import { definition, exampleNode } from "./definition-sidecar-helpers.js";
import { ComponentAccessibilityPattern } from "./definition-enums.js";
import { TooltipPlacement } from "./enums.js";
import type { ComponentDefinitionSidecar } from "./types.js";

export const tooltipSidecar: ComponentDefinitionSidecar = definition({
  behaviors: [
    "Keeps disclosure state interaction-local",
    "Opens from keyboard focus and pointer hover",
    "Dismisses on Escape while retaining trigger focus",
    "Uses a progressive native Popover API adapter with a deterministic fallback"
  ],
  browserScenarios: ["reveals bounded contextual help without moving focus"],
  componentType: CoreComponentType.Tooltip,
  example: exampleNode(CoreComponentType.Tooltip, "shipping-help", {
    content: "Delivery estimates exclude holidays.",
    label: "Shipping information",
    placement: TooltipPlacement.Top
  }),
  pattern: ComponentAccessibilityPattern.Tooltip,
  purpose: "Expose concise non-interactive contextual help from one focusable labeled trigger.",
  requirementIds: [
    "A11Y.TOOLTIP.DESCRIPTION",
    "A11Y.TOOLTIP.KEYBOARD",
    "A11Y.TOOLTIP.DISMISS",
    "OVERLAY.TOOLTIP.PROGRESSIVE_POPOVER"
  ],
  semanticAttachmentPoints: [],
  sensitiveProperties: ["content", "label"]
});
