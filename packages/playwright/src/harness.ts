import { AxeBuilder } from "@axe-core/playwright";
import type { Locator, Page } from "@playwright/test";
import type { UiEvent } from "@unislang/unifold-events";
import {
  AccessibilityImpact,
  ScenarioActionType,
  ScenarioSelectorKind,
  assertCanonicalEventSequence,
  assertSelectiveUpdates,
  type ScenarioAction,
  type ScenarioSelector,
  type TestScenario
} from "@unislang/unifold-testkit";
import { readCapturedEvents, readRenderBaseline, readRenderUpdates } from "./browser-capture.js";

type LocatorFactory = (page: Page, selector: ScenarioSelector) => Locator;
type ActionRunner = (locator: Locator, action: ScenarioAction) => Promise<void>;
interface AccessibilityNode {
  readonly failureSummary?: string;
  readonly target?: readonly unknown[];
}
interface AccessibilityViolation {
  readonly id: string;
  readonly impact?: string | null;
  readonly nodes?: readonly AccessibilityNode[];
}

const LOCATORS: Record<ScenarioSelectorKind, LocatorFactory> = {
  [ScenarioSelectorKind.Label]: (page, selector) => page.getByLabel(selector.value),
  [ScenarioSelectorKind.NodeId]: (page, selector) =>
    page.locator(`[data-unifold-node-id="${selector.value}"]`),
  [ScenarioSelectorKind.Role]: (page, selector) =>
    page.getByRole(selector.value as Parameters<Page["getByRole"]>[0], roleOptions(selector)),
  [ScenarioSelectorKind.TestId]: (page, selector) => page.getByTestId(selector.value),
  [ScenarioSelectorKind.Text]: (page, selector) => page.getByText(selector.value)
};

const ACTIONS: Record<ScenarioActionType, ActionRunner> = {
  [ScenarioActionType.Blur]: (locator) => locator.blur(),
  [ScenarioActionType.Click]: (locator) => locator.click(),
  [ScenarioActionType.Fill]: (locator, action) => locator.fill(stringValue(action)),
  [ScenarioActionType.Focus]: (locator) => locator.focus(),
  [ScenarioActionType.Press]: (locator, action) => locator.press(stringValue(action)),
  [ScenarioActionType.Select]: async (locator, action) => {
    await locator.selectOption(stringValue(action));
  }
};

export class UnifoldHarness {
  constructor(private readonly page: Page) {}

  async run(scenario: TestScenario): Promise<void> {
    await this.page.setViewportSize(scenario.environment.viewport);
    await this.page.goto(scenario.route);
    const baseline = await readRenderBaseline(this.page, scenarioNodeIds(scenario));
    for (const action of scenario.actions) await this.perform(action);
    const events = await readCapturedEvents(this.page);
    assertCanonicalEventSequence(events, scenario.expectedEvents);
    const updates = await readRenderUpdates(this.page, baseline);
    assertSelectiveUpdates(updates, scenario.expectedUpdates);
    await this.assertAccessibility(scenario.accessibility.forbiddenImpacts);
  }

  async assertAccessibility(
    forbiddenImpacts: readonly string[] = [
      AccessibilityImpact.Critical,
      AccessibilityImpact.Serious
    ]
  ): Promise<void> {
    const results = await new AxeBuilder({ page: this.page }).analyze();
    const forbidden = new Set(forbiddenImpacts);
    const violations = results.violations.filter((item) => {
      const impact = item.impact;
      return impact !== undefined && impact !== null && forbidden.has(impact);
    });
    if (violations.length > 0) throw new Error(formatViolations(violations));
  }

  async events(): Promise<readonly UiEvent[]> {
    return readCapturedEvents(this.page);
  }

  locator(selector: ScenarioSelector): Locator {
    return LOCATORS[selector.kind](this.page, selector);
  }

  private async perform(action: ScenarioAction): Promise<void> {
    await ACTIONS[action.type](this.locator(action.target), action);
  }
}

function roleOptions(selector: ScenarioSelector): { name?: string } {
  return selector.name === undefined ? {} : { name: selector.name };
}

function stringValue(action: ScenarioAction): string {
  if (typeof action.value !== "string") throw new Error(`${action.type} requires text.`);
  return action.value;
}

function scenarioNodeIds(scenario: TestScenario): readonly string[] {
  return [
    ...scenario.expectedUpdates.affectedNodeIds,
    ...scenario.expectedUpdates.unaffectedNodeIds
  ];
}

function formatViolations(violations: readonly AccessibilityViolation[]): string {
  return `Accessibility violations: ${violations.map(formatViolation).join("; ")}`;
}

function formatViolation(violation: AccessibilityViolation): string {
  const targets = (violation.nodes ?? []).map(formatNode).join(", ");
  const suffix = targets.length === 0 ? "" : ` at ${targets}`;
  return `${violation.id} (${formatImpact(violation.impact)})${suffix}`;
}

function formatNode(node: AccessibilityNode): string {
  const target = formatTarget(node.target ?? []);
  const summary = normalizeSummary(node.failureSummary);
  return summary.length === 0 ? target : `${target}: ${summary}`;
}

function formatImpact(impact: string | null | undefined): string {
  return impact ?? "unknown";
}

function formatTarget(target: readonly unknown[]): string {
  return target.length === 0 ? "unknown target" : target.map(String).join(" ");
}

function normalizeSummary(summary: string | undefined): string {
  return summary?.replaceAll(/\s+/g, " ").trim() ?? "";
}
