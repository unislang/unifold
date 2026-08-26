import type { JsonObject, JsonValue, UiDocument } from "@unislang/unifold-contracts";
import type { UiEventPhase, UiEventType } from "@unislang/unifold-events";
import {
  AccessibilityImpact,
  ColorMode,
  InputModality,
  ScenarioActionType,
  ScenarioSelectorKind,
  ScenarioVersion
} from "./enums.js";

export interface ScenarioSelector extends JsonObject {
  readonly kind: ScenarioSelectorKind;
  readonly name?: string;
  readonly value: string;
}

export interface ScenarioAction extends JsonObject {
  readonly type: ScenarioActionType;
  readonly target: ScenarioSelector;
  readonly value?: JsonValue;
}

export interface CanonicalEventExpectation extends JsonObject {
  readonly type: UiEventType | string;
  readonly phase?: UiEventPhase;
  readonly sourceNodeId?: string;
  readonly transactionId?: string;
  readonly change?: JsonValue;
}

export interface SelectiveUpdateExpectation extends JsonObject {
  readonly affectedNodeIds: readonly string[];
  readonly unaffectedNodeIds: readonly string[];
}

export interface AccessibilityExpectation extends JsonObject {
  readonly forbiddenImpacts: readonly AccessibilityImpact[];
  readonly keyboardOnly: boolean;
}

export interface ScenarioEnvironment extends JsonObject {
  readonly colorMode: ColorMode;
  readonly inputModality: InputModality;
  readonly locale: string;
  readonly viewport: ScenarioViewport;
}

export interface ScenarioViewport extends JsonObject {
  readonly height: number;
  readonly width: number;
}

export interface TestScenario extends JsonObject {
  readonly scenarioVersion: ScenarioVersion;
  readonly id: string;
  readonly title: string;
  readonly route: string;
  readonly document?: UiDocument;
  readonly environment: ScenarioEnvironment;
  readonly actions: readonly ScenarioAction[];
  readonly expectedEvents: readonly CanonicalEventExpectation[];
  readonly expectedUpdates: SelectiveUpdateExpectation;
  readonly accessibility: AccessibilityExpectation;
}

export function defineScenario<const TScenario extends TestScenario>(
  scenario: TScenario
): TScenario {
  validateScenario(scenario);
  return Object.freeze(scenario);
}

function validateScenario(scenario: TestScenario): void {
  requireText(scenario.id, "Scenario id");
  requireText(scenario.title, "Scenario title");
  requireText(scenario.route, "Scenario route");
  requireUnique(scenario.expectedUpdates.affectedNodeIds, "affected node");
  requireUnique(scenario.expectedUpdates.unaffectedNodeIds, "unaffected node");
}

function requireText(value: string, label: string): void {
  if (!value.trim()) throw new Error(`${label} cannot be empty.`);
}

function requireUnique(values: readonly string[], label: string): void {
  if (new Set(values).size !== values.length) {
    throw new Error(`Duplicate ${label} id.`);
  }
}
