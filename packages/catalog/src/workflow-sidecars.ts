import { CoreComponentType } from "@unislang/unifold-contracts";

import { definition, exampleNode as node } from "./definition-sidecar-helpers.js";
import { ComponentAccessibilityPattern } from "./definition-enums.js";
import type { ComponentDefinitionSidecar } from "./types.js";

const steps = [
  { description: "Enter account details", id: "account", label: "Account" },
  { description: "Confirm the submission", id: "review", label: "Review" }
];

export const stepperSidecar: ComponentDefinitionSidecar = definition({
  behaviors: [
    "Exposes ordered progress with one aria-current step",
    "Emits complete controlled step-selection snapshots"
  ],
  browserScenarios: ["selects an accessible workflow step through canonical state"],
  componentType: CoreComponentType.Stepper,
  example: node(CoreComponentType.Stepper, "checkout-progress", {
    label: "Checkout progress",
    steps,
    value: "account"
  }),
  pattern: ComponentAccessibilityPattern.StepNavigation,
  purpose: "Expose and optionally navigate one bounded ordered workflow progression.",
  requirementIds: [
    "A11Y.STEPPER.CURRENT_STEP",
    "EVENT.CONTROL.INPUT",
    "SECURITY.STEP_NAVIGATION.ESCAPED_TEXT"
  ],
  semanticAttachmentPoints: [],
  sensitiveProperties: ["errorMessage", "label", "steps", "value"]
});

export const tabsSidecar: ComponentDefinitionSidecar = definition({
  behaviors: [
    "Maps every bounded tab to one stable authored child panel",
    "Supports automatic or manual roving-focus activation",
    "Emits complete controlled tab-selection snapshots"
  ],
  browserScenarios: ["switches stable tab panels through canonical controlled state"],
  componentType: CoreComponentType.Tabs,
  example: node(CoreComponentType.Tabs, "account-tabs", {
    $children: [
      node(CoreComponentType.Text, "summary-panel", { content: "Account summary" }),
      node(CoreComponentType.Text, "activity-panel", { content: "Recent activity" })
    ],
    label: "Account sections",
    tabs: [
      { id: "summary", label: "Summary" },
      { id: "activity", label: "Activity" }
    ],
    value: "summary"
  }),
  pattern: ComponentAccessibilityPattern.Tabs,
  purpose: "Switch among bounded authored panels while retaining each panel's DOM identity.",
  requirementIds: [
    "A11Y.TABS.ACTIVE_PANEL",
    "A11Y.TABS.ROVING_FOCUS",
    "EVENT.CONTROL.INPUT",
    "SECURITY.TABS.ESCAPED_TEXT"
  ],
  semanticAttachmentPoints: [],
  sensitiveProperties: ["errorMessage", "label", "tabs", "value"]
});

export const wizardSidecar: ComponentDefinitionSidecar = definition({
  behaviors: [
    "Maps each ordered step to one stable authored child panel",
    "Uses linear Back and Next navigation without replacing child identities",
    "Emits an explicit completion intent from the final step"
  ],
  browserScenarios: ["navigates a composed wizard through controlled JSON state"],
  componentType: CoreComponentType.Wizard,
  example: node(CoreComponentType.Wizard, "account-wizard", {
    $children: [
      node(CoreComponentType.Text, "account-panel", { content: "Account details" }),
      node(CoreComponentType.Text, "review-panel", { content: "Review details" })
    ],
    label: "Create account",
    steps,
    value: "account"
  }),
  pattern: ComponentAccessibilityPattern.StepNavigation,
  purpose: "Navigate a bounded sequence of authored component panels and complete the workflow.",
  requirementIds: [
    "A11Y.WIZARD.CURRENT_PANEL",
    "A11Y.WIZARD.FOCUS",
    "EVENT.COMPONENT.ACTIVATED",
    "EVENT.CONTROL.INPUT",
    "SECURITY.STEP_NAVIGATION.ESCAPED_TEXT"
  ],
  semanticAttachmentPoints: [],
  sensitiveProperties: [
    "backLabel",
    "completeLabel",
    "errorMessage",
    "label",
    "nextLabel",
    "steps",
    "value"
  ]
});
