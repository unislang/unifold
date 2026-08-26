import { CoreComponentType } from "@unislang/unifold-contracts";

import { definition, exampleNode } from "./definition-sidecar-helpers.js";
import { ComponentAccessibilityPattern } from "./enums.js";
import type { ComponentDefinitionSidecar } from "./types.js";

export const dialogSidecar: ComponentDefinitionSidecar = definition({
  behaviors: [
    "Uses native modal dialog semantics with a deterministic bounded fallback",
    "Moves focus into the dialog, contains keyboard focus, and restores the trigger",
    "Makes background branches inert for the complete open lifetime",
    "Emits canonical activation intents for trigger, dismiss, Escape, and native close requests"
  ],
  browserScenarios: [
    "opens modal JSON content, contains focus, and recovers without losing identity"
  ],
  componentType: CoreComponentType.Dialog,
  example: exampleNode(CoreComponentType.Dialog, "confirm-account-change", {
    $children: [
      exampleNode(CoreComponentType.Text, "confirmation-copy", {
        content: "Review this account change before continuing."
      })
    ],
    dialogLabel: "Confirm account change",
    dismissLabel: "Cancel account change",
    label: "Review account change"
  }),
  pattern: ComponentAccessibilityPattern.ModalDialog,
  purpose: "Present bounded JSON-authored content in one focus-contained modal interaction.",
  requirementIds: [
    "A11Y.DIALOG.NAME",
    "A11Y.DIALOG.FOCUS_CONTAINMENT",
    "A11Y.DIALOG.RETURN_FOCUS",
    "OVERLAY.DIALOG.NATIVE_MODAL",
    "EVENT.COMPONENT.ACTIVATED"
  ],
  semanticAttachmentPoints: [],
  sensitiveProperties: ["dialogLabel", "dismissLabel", "label"]
});
