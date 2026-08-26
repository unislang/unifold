import { CoreComponentType } from "@unislang/unifold-contracts";

import { definition, exampleNode } from "./definition-sidecar-helpers.js";
import { ComponentAccessibilityPattern } from "./definition-enums.js";
import type { ComponentDefinitionSidecar } from "./types.js";

export const checkboxGroupSidecar: ComponentDefinitionSidecar = definition({
  behaviors: [
    "Uses one native fieldset, legend, and checkbox per declared option",
    "Emits complete deterministic string-array input and blur intents",
    "Submits enabled selections as repeated same-name native form values"
  ],
  browserScenarios: ["routes CheckboxGroup selections through canonical repeated state"],
  componentType: CoreComponentType.CheckboxGroup,
  example: exampleNode(CoreComponentType.CheckboxGroup, "topics", {
    label: "Topics",
    name: "topics",
    options: [
      { label: "Product news", value: "news" },
      { label: "Security alerts", value: "security" }
    ],
    value: ["news"]
  }),
  pattern: ComponentAccessibilityPattern.NativeCheckboxGroup,
  purpose: "Choose zero or more visible bounded options with native checkbox semantics.",
  requirementIds: [
    "A11Y.CHECKBOX_GROUP.NATIVE",
    "EVENT.CONTROL.INPUT",
    "FORM.CHECKBOX_GROUP.REPEATED"
  ],
  semanticAttachmentPoints: [],
  sensitiveProperties: ["errorMessage", "options", "value"]
});
