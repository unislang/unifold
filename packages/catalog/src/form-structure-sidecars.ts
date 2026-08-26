import { CoreComponentType } from "@unislang/unifold-contracts";

import { definition, exampleNode as node } from "./definition-sidecar-helpers.js";
import { ComponentAccessibilityPattern } from "./definition-enums.js";
import type { ComponentDefinitionSidecar } from "./types.js";

export const errorSummarySidecar: ComponentDefinitionSidecar = definition({
  behaviors: [
    "Announces a bounded aggregate error list",
    "Moves focus to the referenced control without changing state"
  ],
  browserScenarios: ["announces aggregate errors and focuses their exact control target"],
  componentType: CoreComponentType.ErrorSummary,
  example: node(CoreComponentType.ErrorSummary, "errors", {
    errors: [],
    title: "There is a problem"
  }),
  pattern: ComponentAccessibilityPattern.ErrorSummary,
  purpose: "Summarize validated form errors and route users to exact control identities.",
  requirementIds: ["A11Y.ERROR_SUMMARY.FOCUS", "SECURITY.ERROR_SUMMARY.TARGETS"],
  semanticAttachmentPoints: [],
  sensitiveProperties: ["errors", "title"]
});

export const fieldSidecar: ComponentDefinitionSidecar = definition({
  behaviors: ["Groups exactly one control", "Exposes help and validation context in DOM order"],
  browserScenarios: ["projects field label, help, and exactly one stable control"],
  componentType: CoreComponentType.Field,
  example: node(CoreComponentType.Field, "name-field", {
    $children: [node(CoreComponentType.TextField, "name", { label: "Name" })],
    label: "Name"
  }),
  pattern: ComponentAccessibilityPattern.FieldGroup,
  purpose: "Provide visible context around one independently labeled interactive control.",
  requirementIds: ["A11Y.FIELD.GROUP", "A11Y.FIELD.DESCRIPTION"],
  semanticAttachmentPoints: [],
  sensitiveProperties: ["errorMessage", "helpText", "label"]
});

export const fieldsetSidecar: ComponentDefinitionSidecar = definition({
  behaviors: [
    "Keeps descendants in the native form tree",
    "Applies native grouped disabled semantics"
  ],
  browserScenarios: ["keeps nested fields in native FormData and applies fieldset disablement"],
  componentType: CoreComponentType.Fieldset,
  example: node(CoreComponentType.Fieldset, "contact", {
    $children: [node(CoreComponentType.TextField, "email", { label: "Email" })],
    label: "Contact details"
  }),
  pattern: ComponentAccessibilityPattern.NativeFieldset,
  purpose: "Group related controls under one native legend and disabled-state boundary.",
  requirementIds: ["A11Y.FIELDSET.NATIVE", "FORM.FIELDSET.DISABLED"],
  semanticAttachmentPoints: [],
  sensitiveProperties: ["helpText", "label"]
});

export const formSidecar: ComponentDefinitionSidecar = definition({
  behaviors: ["Uses native form submission", "Projects aggregate errors and canonical form facts"],
  browserScenarios: [
    "submits heterogeneous values, omits disabled controls, and resets atomically"
  ],
  componentType: CoreComponentType.Form,
  example: node(CoreComponentType.Form, "profile", { label: "Profile" }),
  pattern: ComponentAccessibilityPattern.NativeForm,
  purpose: "Coordinate descendant controls as one runtime-owned form aggregate.",
  requirementIds: ["A11Y.FORM.NATIVE", "EVENT.FORM.SUBMITTED"],
  semanticAttachmentPoints: [],
  sensitiveProperties: ["errorMessages"]
});
