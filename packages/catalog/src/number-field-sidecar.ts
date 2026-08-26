import { CoreComponentType } from "@unislang/unifold-contracts";

import { definition, exampleNode } from "./definition-sidecar-helpers.js";
import { ComponentAccessibilityPattern } from "./definition-enums.js";
import type { ComponentDefinitionSidecar } from "./types.js";

export const numberFieldSidecar: ComponentDefinitionSidecar = definition({
  behaviors: [
    "Uses one native number input with a programmatically associated label",
    "Keeps empty state as null and canonical non-empty state as a finite JSON number",
    "Projects required, minimum, maximum, and step validity through the shared form graph",
    "Emits controlled numeric input and blur intents without locale-formatted wire values"
  ],
  browserScenarios: ["routes bounded NumberField input through numeric canonical state"],
  componentType: CoreComponentType.NumberField,
  example: exampleNode(CoreComponentType.NumberField, "age", {
    label: "Age",
    max: 130,
    min: 0,
    name: "age",
    step: 1,
    value: null
  }),
  pattern: ComponentAccessibilityPattern.NativeNumberInput,
  purpose:
    "Capture an optional finite numeric value with native editing and one canonical JSON number or null.",
  requirementIds: [
    "A11Y.NUMBER_FIELD.NATIVE",
    "EVENT.CONTROL.INPUT",
    "FORM.NUMBER_FIELD.CONSTRAINTS",
    "SECURITY.NUMBER_FIELD.FINITE_JSON"
  ],
  semanticAttachmentPoints: [],
  sensitiveProperties: ["errorMessage", "label", "value"]
});
