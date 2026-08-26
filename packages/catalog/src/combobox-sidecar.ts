import { CoreComponentType } from "@unislang/unifold-contracts";

import { definition, exampleNode } from "./definition-sidecar-helpers.js";
import { ComponentAccessibilityPattern } from "./definition-enums.js";

export const comboboxSidecar = definition({
  behaviors: [
    "Filters a bounded option list without creating a second committed value",
    "Commits only registered options through keyboard or pointer selection",
    "Caps each rendered result window at 200 options"
  ],
  browserScenarios: [
    "filters and selects through active-descendant keyboard semantics",
    "keeps unmatched queries local, restores on Escape, and canonically clears"
  ],
  componentType: CoreComponentType.Combobox,
  example: exampleNode(CoreComponentType.Combobox, "assignee", {
    label: "Assignee",
    options: [{ label: "Ada Lovelace", value: "ada" }]
  }),
  pattern: ComponentAccessibilityPattern.Combobox,
  purpose: "Filter and choose one registered value from a bounded popup listbox.",
  requirementIds: [
    "A11Y.COMBOBOX.ACTIVE_DESCENDANT",
    "A11Y.COMBOBOX.KEYBOARD",
    "EVENT.CONTROL.INPUT",
    "PERF.COMBOBOX.BOUNDED_DOM"
  ],
  semanticAttachmentPoints: [],
  sensitiveProperties: ["errorMessage", "noResultsMessage", "options", "value"]
});
