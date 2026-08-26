import { CoreComponentType } from "@unislang/unifold-contracts";

import { definition, exampleNode } from "./definition-sidecar-helpers.js";
import { ComponentAccessibilityPattern } from "./definition-enums.js";
import type { ComponentDefinitionSidecar } from "./types.js";

export const searchFieldSidecar: ComponentDefinitionSidecar = definition({
  behaviors: [
    "Uses one native search input with a programmatically associated label",
    "Emits canonical string input and blur intents",
    "Projects required validity and native form participation through the shared control graph"
  ],
  browserScenarios: ["routes SearchField input through scalar canonical state"],
  componentType: CoreComponentType.SearchField,
  example: exampleNode(CoreComponentType.SearchField, "query", {
    autocomplete: "off",
    label: "Search",
    name: "query",
    value: ""
  }),
  pattern: ComponentAccessibilityPattern.NativeSearchInput,
  purpose: "Capture one search query with native editing, clearing, and form semantics.",
  requirementIds: ["A11Y.SEARCH_FIELD.NATIVE", "EVENT.CONTROL.INPUT", "FORM.SEARCH_FIELD.NATIVE"],
  semanticAttachmentPoints: [],
  sensitiveProperties: ["errorMessage", "label", "placeholder", "value"]
});

export const textAreaSidecar: ComponentDefinitionSidecar = definition({
  behaviors: ["Uses native multiline editing", "Preserves line breaks in canonical values"],
  browserScenarios: ["commits multiline text through the unified stream and selectively projects"],
  componentType: CoreComponentType.TextArea,
  example: exampleNode(CoreComponentType.TextArea, "biography", { label: "Biography" }),
  pattern: ComponentAccessibilityPattern.NativeTextInput,
  purpose: "Capture one multiline string with labeled validation and selective projection.",
  requirementIds: ["A11Y.TEXT_AREA.NATIVE", "EVENT.CONTROL.INPUT"],
  semanticAttachmentPoints: [],
  sensitiveProperties: ["errorMessage", "value"]
});

export const textFieldSidecar: ComponentDefinitionSidecar = definition({
  behaviors: ["Uses native single-line editing", "Projects accessible validation state"],
  browserScenarios: ["updates the changed control without updating its sibling"],
  componentType: CoreComponentType.TextField,
  example: exampleNode(CoreComponentType.TextField, "name", { label: "Name" }),
  pattern: ComponentAccessibilityPattern.NativeTextInput,
  purpose: "Capture one scalar text value with labeled validation and selective projection.",
  requirementIds: ["A11Y.TEXT_FIELD.NATIVE", "EVENT.CONTROL.INPUT"],
  semanticAttachmentPoints: [],
  sensitiveProperties: ["errorMessage", "value"]
});
