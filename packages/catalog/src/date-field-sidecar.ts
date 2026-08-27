import { CoreComponentType } from "@unislang/unifold-contracts";

import { definition, exampleNode } from "./definition-sidecar-helpers.js";
import { ComponentAccessibilityPattern } from "./definition-enums.js";
import { DateFieldAutocomplete } from "./enums.js";
import type { ComponentDefinitionSidecar } from "./types.js";

export const dateFieldSidecar: ComponentDefinitionSidecar = definition({
  behaviors: [
    "Uses one native date input with a programmatically associated label",
    "Keeps empty state as an empty string and non-empty state as a timezone-free YYYY-MM-DD string",
    "Rejects impossible dates and enforces minimum, maximum, required, and day-step constraints",
    "Emits controlled canonical input and blur intents without Date or timezone conversion"
  ],
  browserScenarios: [
    "routes a date-only field through events, form state, and selective projection"
  ],
  componentType: CoreComponentType.DateField,
  example: exampleNode(CoreComponentType.DateField, "start-date", {
    autocomplete: DateFieldAutocomplete.Off,
    label: "Start date",
    max: "2030-12-31",
    min: "2026-01-01",
    name: "startDate",
    step: 1,
    value: ""
  }),
  pattern: ComponentAccessibilityPattern.NativeDateInput,
  purpose: "Capture one optional calendar date without introducing timezone conversion.",
  requirementIds: [
    "A11Y.DATE_FIELD.NATIVE",
    "EVENT.CONTROL.INPUT",
    "FORM.DATE_FIELD.STRING",
    "SECURITY.DATE_FIELD.CANONICAL"
  ],
  semanticAttachmentPoints: [],
  sensitiveProperties: ["errorMessage", "label", "value"]
});
