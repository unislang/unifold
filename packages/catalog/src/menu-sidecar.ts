import { CoreComponentType } from "@unislang/unifold-contracts";

import { definition, exampleNode } from "./definition-sidecar-helpers.js";
import { ComponentAccessibilityPattern } from "./definition-enums.js";
import type { ComponentDefinitionSidecar } from "./types.js";

export const menuButtonSidecar: ComponentDefinitionSidecar = definition({
  behaviors: [
    "Keeps disclosure and roving-focus state interaction-local",
    "Skips disabled items across pointer and keyboard operation",
    "Emits one canonical activation intent carrying a declared item identifier"
  ],
  browserScenarios: ["invokes a bounded menu action with restored trigger focus"],
  componentType: CoreComponentType.MenuButton,
  example: exampleNode(CoreComponentType.MenuButton, "account-actions", {
    items: [
      { label: "Edit account", value: "edit" },
      { disabled: true, label: "Delete account", value: "delete" }
    ],
    label: "Account actions"
  }),
  pattern: ComponentAccessibilityPattern.MenuButton,
  purpose: "Expose a bounded menu of registered application actions from one native button.",
  requirementIds: [
    "A11Y.MENU_BUTTON.KEYBOARD",
    "A11Y.MENU_BUTTON.FOCUS_RETURN",
    "EVENT.COMPONENT.ACTIVATED",
    "SECURITY.MENU_BUTTON.DECLARED_ACTIONS"
  ],
  semanticAttachmentPoints: [],
  sensitiveProperties: ["items", "label"]
});
