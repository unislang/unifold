import type { Locator, Page } from "@playwright/test";
import {
  AccessibilityImpact,
  ColorMode,
  InputModality,
  ScenarioActionType,
  ScenarioSelectorKind,
  ScenarioVersion,
  defineScenario,
  type ScenarioAction
} from "@unislang/unifold-testkit";
import { beforeEach, expect, it, vi } from "vitest";

const capture = vi.hoisted(() => ({
  baseline: vi.fn(),
  events: vi.fn(),
  updates: vi.fn()
}));
const analyze = vi.hoisted(() => vi.fn());

vi.mock("../src/browser-capture.js", () => ({
  readCapturedEvents: capture.events,
  readRenderBaseline: capture.baseline,
  readRenderUpdates: capture.updates
}));

vi.mock("@axe-core/playwright", () => ({
  AxeBuilder: class {
    async analyze() {
      return analyze();
    }
  }
}));

import { UnifoldHarness } from "./harness.js";

beforeEach(() => {
  capture.baseline.mockResolvedValue({ field: 0, stable: 0 });
  capture.events.mockResolvedValue([]);
  capture.updates.mockResolvedValue([
    { nodeId: "field", updateCount: 1 },
    { nodeId: "stable", updateCount: 0 }
  ]);
  analyze.mockResolvedValue({ violations: [] });
});

it("executes every semantic locator and action", verifyScenarioRun);
it("returns captured events and constructs role options", verifyHarnessPorts);
it("rejects actions whose values are not text", verifyInvalidAction);
it("reports forbidden accessibility violations", verifyAccessibilityFailure);

async function verifyScenarioRun(): Promise<void> {
  const fixture = pageFixture();
  const harness = new UnifoldHarness(fixture.page);
  await harness.run(scenario(allActions()));
  expect(fixture.page.setViewportSize).toHaveBeenCalledWith({ width: 1280, height: 720 });
  expect(fixture.page.goto).toHaveBeenCalledWith("/profile");
  expect(fixture.locator.blur).toHaveBeenCalledTimes(1);
  expect(fixture.locator.click).toHaveBeenCalledTimes(1);
  expect(fixture.locator.fill).toHaveBeenCalledWith("Ada");
  expect(fixture.locator.focus).toHaveBeenCalledTimes(1);
  expect(fixture.locator.press).toHaveBeenCalledWith("Enter");
  expect(fixture.locator.selectOption).toHaveBeenCalledWith("admin");
}

async function verifyHarnessPorts(): Promise<void> {
  const fixture = pageFixture();
  const harness = new UnifoldHarness(fixture.page);
  await expect(harness.events()).resolves.toEqual([]);
  await expect(harness.assertAccessibility()).resolves.toBeUndefined();
  harness.locator({ kind: ScenarioSelectorKind.Role, value: "button", name: "Save" });
  harness.locator({ kind: ScenarioSelectorKind.Role, value: "main" });
  expect(fixture.page.getByRole).toHaveBeenNthCalledWith(1, "button", { name: "Save" });
  expect(fixture.page.getByRole).toHaveBeenNthCalledWith(2, "main", {});
  expect(analyze).toHaveBeenCalledTimes(1);
}

async function verifyInvalidAction(): Promise<void> {
  const harness = new UnifoldHarness(pageFixture().page);
  const action: ScenarioAction = {
    type: ScenarioActionType.Fill,
    target: { kind: ScenarioSelectorKind.Label, value: "Name" },
    value: 42
  };
  await expect(harness.run(scenario([action]))).rejects.toThrow("requires text");
}

async function verifyAccessibilityFailure(): Promise<void> {
  analyze.mockResolvedValueOnce({
    violations: [
      {
        id: "color-contrast",
        impact: "serious",
        nodes: [{ target: ["#save"], failureSummary: "Fix any of the following:\n  contrast" }]
      },
      { id: "informational", impact: null }
    ]
  });
  const harness = new UnifoldHarness(pageFixture().page);
  await expect(harness.run(scenario([]))).rejects.toThrow(
    "Accessibility violations: color-contrast (serious) at #save: Fix any of the following: contrast"
  );
}

function pageFixture() {
  const locator = locatorFixture();
  const page = {
    getByLabel: vi.fn(() => locator),
    getByRole: vi.fn(() => locator),
    getByTestId: vi.fn(() => locator),
    getByText: vi.fn(() => locator),
    goto: vi.fn(async () => undefined),
    locator: vi.fn(() => locator),
    setViewportSize: vi.fn(async () => undefined)
  } as unknown as Page;
  return { locator, page };
}

function locatorFixture(): Locator {
  return {
    blur: vi.fn(async () => undefined),
    click: vi.fn(async () => undefined),
    fill: vi.fn(async () => undefined),
    focus: vi.fn(async () => undefined),
    press: vi.fn(async () => undefined),
    selectOption: vi.fn(async () => [])
  } as unknown as Locator;
}

function allActions(): ScenarioAction[] {
  return [
    action(ScenarioActionType.Blur, ScenarioSelectorKind.Label, "Name"),
    action(ScenarioActionType.Click, ScenarioSelectorKind.NodeId, "save"),
    action(ScenarioActionType.Fill, ScenarioSelectorKind.TestId, "name", "Ada"),
    action(ScenarioActionType.Focus, ScenarioSelectorKind.Text, "Name"),
    action(ScenarioActionType.Press, ScenarioSelectorKind.Role, "button", "Enter"),
    action(ScenarioActionType.Select, ScenarioSelectorKind.Label, "Role", "admin")
  ];
}

function action(
  type: ScenarioActionType,
  kind: ScenarioSelectorKind,
  value: string,
  actionValue?: string
): ScenarioAction {
  return { type, target: { kind, value }, ...(actionValue ? { value: actionValue } : {}) };
}

function scenario(actions: readonly ScenarioAction[]) {
  return defineScenario({
    scenarioVersion: ScenarioVersion.Version1,
    id: "harness-test",
    title: "Harness test",
    route: "/profile",
    environment: {
      colorMode: ColorMode.Light,
      inputModality: InputModality.Keyboard,
      locale: "en-US",
      viewport: { width: 1280, height: 720 }
    },
    actions,
    expectedEvents: [],
    expectedUpdates: { affectedNodeIds: ["field"], unaffectedNodeIds: ["stable"] },
    accessibility: {
      forbiddenImpacts: [AccessibilityImpact.Critical, AccessibilityImpact.Serious],
      keyboardOnly: true
    }
  });
}
