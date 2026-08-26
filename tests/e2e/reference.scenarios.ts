import { ElementEventType } from "@unislang/unifold-elements";
import { UiEventPhase, UiEventType } from "@unislang/unifold-events";
import {
  AccessibilityImpact,
  ColorMode,
  InputModality,
  ScenarioActionType,
  ScenarioSelectorKind,
  ScenarioVersion,
  defineScenario
} from "@unislang/unifold-testkit";

export const compositionNodeIds = {
  accordion: "profile-editor::help",
  accountTabs: "profile-editor::account-tabs",
  accountActions: "profile-editor::account-actions",
  activityPanel: "profile-editor::activity-panel",
  biography: "profile-editor::biography",
  checkbox: "profile-editor::newsletter",
  combobox: "profile-editor::assignee",
  confirmName: "profile-editor::confirm-name",
  country: "profile-editor::country",
  dynamicHelp: "profile-editor::dynamic-help",
  form: "profile-editor::form",
  helpBox: "profile-editor::help-box",
  helpGrid: "profile-editor::help-grid",
  helpStack: "profile-editor::help-stack",
  internalNote: "profile-editor::internal-note",
  multiSelect: "profile-editor::skills",
  name: "profile-editor::name",
  radioGroup: "profile-editor::contact-preference",
  root: "profile-editor",
  reset: "profile-editor::slot:actions::reset",
  submit: "profile-editor::slot:actions::submit",
  supportAlert: "profile-editor::support-alert",
  supportCopy: "profile-editor::support-copy",
  supportHeading: "profile-editor::support-heading",
  supportIcon: "profile-editor::support-icon",
  supportLink: "profile-editor::support-link"
} as const;

export const accessibilityScenario = defineScenario({
  scenarioVersion: ScenarioVersion.Version1,
  id: "reference-default-accessibility",
  title: "Reference form default accessibility",
  route: "/",
  environment: {
    colorMode: ColorMode.Light,
    inputModality: InputModality.Keyboard,
    locale: "en-US",
    viewport: { width: 1280, height: 720 }
  },
  actions: [],
  expectedEvents: [],
  expectedUpdates: {
    affectedNodeIds: [],
    unaffectedNodeIds: [compositionNodeIds.name, compositionNodeIds.submit]
  },
  accessibility: {
    forbiddenImpacts: [AccessibilityImpact.Critical, AccessibilityImpact.Serious],
    keyboardOnly: true
  }
});

export const expandedAccessibilityScenario = defineScenario({
  scenarioVersion: ScenarioVersion.Version1,
  id: "reference-expanded-accordion-accessibility",
  title: "Expanded accordion accessibility",
  route: "/",
  environment: {
    colorMode: ColorMode.Light,
    inputModality: InputModality.Keyboard,
    locale: "en-US",
    viewport: { width: 1280, height: 720 }
  },
  actions: [
    {
      type: ScenarioActionType.Press,
      target: { kind: ScenarioSelectorKind.Text, value: "Help and support" },
      value: "Enter"
    }
  ],
  expectedEvents: [
    {
      change: { value: true },
      phase: UiEventPhase.Intent,
      sourceNodeId: compositionNodeIds.accordion,
      type: ElementEventType.ControlInput
    },
    { phase: UiEventPhase.State, type: UiEventType.CommandApplied },
    { phase: UiEventPhase.State, type: UiEventType.TransactionCommitted }
  ],
  expectedUpdates: {
    affectedNodeIds: [compositionNodeIds.accordion],
    unaffectedNodeIds: [compositionNodeIds.checkbox]
  },
  accessibility: {
    forbiddenImpacts: [AccessibilityImpact.Critical, AccessibilityImpact.Serious],
    keyboardOnly: true
  }
});
