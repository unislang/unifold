import { CoreComponentType } from "@unislang/unifold-contracts";

import { definition, exampleNode } from "./definition-sidecar-helpers.js";
import { ComponentAccessibilityPattern } from "./definition-enums.js";
import { ToastStatus, ToastVariant } from "./enums.js";
import type { ComponentDefinitionSidecar } from "./types.js";

export const toastSidecar: ComponentDefinitionSidecar = definition({
  behaviors: [
    "Persists until application state removes it or its explicit dismiss action is activated",
    "Renders the label as a visible title and the message as its body inside atomic live text",
    "Maps informational and success messages to polite status semantics",
    "Maps warning and error messages to assertive alert semantics",
    "Keeps the atomic live text separate from its optional dismiss button and never moves focus",
    "Removes hidden notifications from layout and the accessibility tree without announcing"
  ],
  browserScenarios: ["announces and dismisses one bounded toast through the unified stream"],
  componentType: CoreComponentType.Toast,
  example: exampleNode(CoreComponentType.Toast, "profile-saved", {
    dismissLabel: "Dismiss saved notification",
    label: "Profile saved",
    message: "Your profile changes are available now.",
    status: ToastStatus.Success,
    variant: ToastVariant.Subtle
  }),
  pattern: ComponentAccessibilityPattern.LiveRegion,
  purpose: "Announce one persistent application outcome without interrupting focus or expiring it.",
  requirementIds: [
    "A11Y.TOAST.LIVE_REGION",
    "A11Y.TOAST.NO_FOCUS_MOVE",
    "A11Y.TOAST.PERSISTENT",
    "EVENT.COMPONENT.ACTIVATED"
  ],
  semanticAttachmentPoints: [],
  sensitiveProperties: ["label", "message"]
});
