import { UiEventPhase, UiEventType, createUiEvent } from "@unislang/unifold-events";
import { expect, it } from "vitest";
import {
  AccessibilityImpact,
  ColorMode,
  InputModality,
  ScenarioActionType,
  ScenarioAssertionError,
  ScenarioSelectorKind,
  ScenarioVersion,
  assertCanonicalEventSequence,
  assertSelectiveUpdates,
  defineScenario
} from "./index.js";

it("asserts canonical event facts and selective updates", () => {
  const event = createUiEvent({
    id: "event-1",
    source: "urn:unifold:test",
    type: UiEventType.CommandApplied,
    time: "2026-08-24T00:00:00.000Z",
    correlationid: "correlation-1",
    transactionid: "transaction-1",
    sequence: 1,
    staterevision: 1,
    data: { phase: UiEventPhase.State, runtime: { documentId: "contact" } }
  });
  assertCanonicalEventSequence(
    [event],
    [
      {
        type: UiEventType.CommandApplied,
        phase: UiEventPhase.State
      }
    ]
  );
  assertSelectiveUpdates([{ nodeId: "name", updateCount: 1 }], {
    affectedNodeIds: ["name"],
    unaffectedNodeIds: ["submit"]
  });
});

it("rejects an unexpected update", () => {
  expect(() =>
    assertSelectiveUpdates([{ nodeId: "submit", updateCount: 1 }], {
      affectedNodeIds: [],
      unaffectedNodeIds: ["submit"]
    })
  ).toThrow(ScenarioAssertionError);
});

it("defines a serializable scenario", () => {
  const scenario = defineScenario({
    scenarioVersion: ScenarioVersion.Version1,
    id: "contact",
    title: "Contact form",
    route: "/",
    environment: {
      colorMode: ColorMode.Light,
      inputModality: InputModality.Keyboard,
      locale: "en-US",
      viewport: { width: 1280, height: 720 }
    },
    actions: [
      {
        type: ScenarioActionType.Fill,
        target: { kind: ScenarioSelectorKind.Label, value: "Name" },
        value: "Ada"
      }
    ],
    expectedEvents: [],
    expectedUpdates: {
      affectedNodeIds: ["name"],
      unaffectedNodeIds: ["submit"]
    },
    accessibility: { forbiddenImpacts: [AccessibilityImpact.Critical], keyboardOnly: true }
  });
  expect(JSON.parse(JSON.stringify(scenario))).toEqual(scenario);
});
