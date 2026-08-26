import { CoreComponentType } from "@unislang/unifold-contracts";

import { definition, exampleNode } from "./definition-sidecar-helpers.js";
import { ComponentAccessibilityPattern } from "./definition-enums.js";
import type { ComponentDefinitionSidecar } from "./types.js";

export const switchSidecar: ComponentDefinitionSidecar = definition({
  behaviors: [
    "Uses one labeled native checkbox with the ARIA switch role",
    "Emits complete boolean input and blur intents",
    "Participates in native form submission, reset, restore, and validation"
  ],
  browserScenarios: [
    "routes one native Switch through events, form state, and selective projection"
  ],
  componentType: CoreComponentType.Switch,
  example: exampleNode(CoreComponentType.Switch, "notifications", {
    label: "Enable notifications",
    name: "notifications",
    value: true
  }),
  pattern: ComponentAccessibilityPattern.Switch,
  purpose: "Toggle one immediate binary setting with explicit on and off semantics.",
  requirementIds: ["A11Y.SWITCH.ROLE", "EVENT.CONTROL.INPUT", "FORM.SWITCH.BOOLEAN"],
  semanticAttachmentPoints: [],
  sensitiveProperties: ["errorMessage", "value"]
});
