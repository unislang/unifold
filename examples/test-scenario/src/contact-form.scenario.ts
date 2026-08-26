import { UiEventPhase } from "@unislang/unifold-events";
import {
  AccessibilityImpact,
  ColorMode,
  InputModality,
  ScenarioActionType,
  ScenarioSelectorKind,
  ScenarioVersion,
  defineScenario
} from "@unislang/unifold-testkit";

export const contactFormScenario = defineScenario({
  scenarioVersion: ScenarioVersion.Version1,
  id: "contact-form-name-entry",
  title: "Update a composed field without updating its slotted submit button",
  route: "/",
  environment: {
    colorMode: ColorMode.Light,
    inputModality: InputModality.Keyboard,
    locale: "en-US",
    viewport: { height: 720, width: 1280 }
  },
  actions: [
    {
      type: ScenarioActionType.Fill,
      target: { kind: ScenarioSelectorKind.Label, value: "Your name" },
      value: "Ada Lovelace"
    }
  ],
  expectedEvents: [
    {
      type: "org.unifold.ui.control.input.v1",
      phase: UiEventPhase.Intent,
      sourceNodeId: "profile-editor::name",
      change: { value: "Ada Lovelace" }
    }
  ],
  expectedUpdates: {
    affectedNodeIds: ["profile-editor::name"],
    unaffectedNodeIds: ["profile-editor::slot:actions::submit"]
  },
  accessibility: {
    forbiddenImpacts: [AccessibilityImpact.Critical, AccessibilityImpact.Serious],
    keyboardOnly: true
  }
});
