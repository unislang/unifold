import { expect, test } from "@playwright/test";
import { JsonUiFeature, JsonUiProfileDiagnosticCode } from "@unislang/unifold-jsonui";

import { PARITY_CASES } from "./src/cases.js";
import { BEHAVIOR_PARITY_CASE_ID } from "./src/behavior-parity.js";
import {
  ParityPreparationStatus,
  type BehaviorParityResult,
  type NormalizedCanonicalEvent,
  type ParityCaseResult
} from "./src/types.js";

for (const { id } of PARITY_CASES) {
  test(`${id} matches upstream traversal and Unifold IR`, async ({ page }) => {
    await page.goto(`/?case=${id}`);
    const result = await parityResult(page, id);
    expect(result.status).toBe(ParityPreparationStatus.Prepared);
    expect(result.initialEventCount).toBe(0);
    expect(result.ir).toEqual(result.expected);
    await expect(upstreamNodes(page, id)).toHaveCount(result.expected.length);
    expect(await upstreamTree(page, id)).toEqual(result.expected);
    expect(await unifoldNodeIds(page, id)).toEqual(result.expected.map(({ id }) => id));
    await assertVisibleText(page, id, result.expected);
    await assertControlValues(page, id, result.expected);
    expect(await emittedEventCount(page, id)).toBe(0);
  });
}

test("renders the official upstream example but rejects its unsupported syntax", async ({
  page
}) => {
  await page.goto("/?case=official-readme-quick-example");
  await assertOfficialFixture(page);
});

test("matches binding and validation outcomes with canonical Unifold event semantics", async ({
  page
}) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.goto(`/?case=${BEHAVIOR_PARITY_CASE_ID}`);
  expect(pageErrors).toEqual([]);
  const upstream = behaviorInput(page, "upstream");
  const unifold = behaviorInput(page, "unifold");
  await expect(upstream).toHaveValue("John");
  await expect(unifold).toHaveValue("John");
  await upstream.fill("Ada");
  await unifold.fill("Ada");
  await assertBehaviorState(page, "Ada", false);
  assertCanonicalBatch((await behaviorResult(page)).canonicalEvents, 1, 2);
  await upstream.fill("");
  await unifold.fill("");
  await unifold.blur();
  await assertBehaviorState(page, "", true);
  await upstream.fill("Grace");
  await unifold.fill("Grace");
  await assertBehaviorState(page, "Grace", false);
});

async function assertBehaviorState(
  page: import("@playwright/test").Page,
  value: string,
  invalid: boolean
): Promise<void> {
  const expected = String(invalid);
  await expect(behaviorInput(page, "upstream")).toHaveValue(value);
  await expect(behaviorInput(page, "unifold")).toHaveValue(value);
  await expect(behaviorInput(page, "upstream")).toHaveAttribute("aria-invalid", expected);
  await expect(behaviorInput(page, "unifold")).toHaveAttribute("aria-invalid", expected);
  await expect.poll(async () => (await behaviorResult(page)).unifoldStoreValue).toBe(value);
}

function assertCanonicalBatch(
  events: readonly NormalizedCanonicalEvent[],
  operationSequence: number,
  runtimeSequence: number
): void {
  expect(events).toHaveLength(6);
  expect(events.map(({ type }) => type)).toEqual(canonicalEventTypes);
  expect(events.map(({ phase }) => phase)).toEqual(canonicalEventPhases);
  expect(events.map(({ commandType }) => commandType)).toEqual(canonicalCommandTypes);
  expect(events[0]?.sequence).toBe(operationSequence);
  expect(events.slice(1).map(({ sequence }) => sequence)).toEqual(
    Array.from({ length: 5 }, (_, index) => runtimeSequence + index)
  );
  assertCanonicalIdentity(events);
  expect(events.every(({ disclosureMode }) => disclosureMode === "metadata-only")).toBe(true);
  expect(events.every(({ hasSnapshot }) => !hasSnapshot)).toBe(true);
  expect(events.map(({ redactionReason }) => redactionReason)).toEqual(canonicalRedactionReasons);
  expect(events.slice(1).every(({ stateRevision }) => stateRevision === operationSequence)).toBe(
    true
  );
}

function assertCanonicalIdentity(events: readonly NormalizedCanonicalEvent[]): void {
  const intent = events[0];
  expect(intent).toBeDefined();
  if (intent === undefined) return;
  expect(new Set(events.map(({ correlationId }) => correlationId)).size).toBe(1);
  expect(new Set(events.map(({ transactionId }) => transactionId)).size).toBe(1);
  expect(events.slice(1).every(({ causationId }) => causationId === intent.id)).toBe(true);
  expect(events.every(({ sourceNodeId }) => sourceNodeId === "name")).toBe(true);
}

const canonicalEventTypes = [
  "org.unifold.ui.control.input.v1",
  "org.unifold.ui.command.applied.v1",
  "org.unifold.ui.command.applied.v1",
  "org.unifold.ui.transaction.committed.v1",
  "org.unifold.ui.effect.requested.v1",
  "org.unifold.ui.effect.completed.v1"
];
const canonicalEventPhases = ["intent", "state", "state", "state", "effect", "effect"];
const canonicalCommandTypes = [
  undefined,
  "control.set-value",
  "store.write",
  undefined,
  "store.write",
  "store.write"
];
const canonicalRedactionReasons = [
  "classification",
  "classification",
  "store-write",
  "classification",
  "store-write",
  "store-write"
];

async function behaviorResult(
  page: import("@playwright/test").Page
): Promise<BehaviorParityResult> {
  return page.evaluate(() => {
    const result = window.__jsonUiParity.behavior;
    if (result === undefined) throw new Error("Behavior parity result is missing.");
    return result;
  });
}

function behaviorInput(page: import("@playwright/test").Page, kind: string) {
  return renderer(page, BEHAVIOR_PARITY_CASE_ID, kind).getByRole("textbox", {
    name: "First name"
  });
}

async function assertOfficialFixture(page: import("@playwright/test").Page): Promise<void> {
  const fixtureId = "official-readme-quick-example";
  const result = await parityResult(page, fixtureId);
  expect(result.status).toBe(ParityPreparationStatus.Rejected);
  expect(result.initialEventCount).toBe(0);
  expect(result.diagnostics[0]).toEqual({ code: "invalid-composed-document", path: "/view" });
  expect(result.profileDiagnostics).toEqual(officialProfileDiagnostics);
  await expect(renderer(page, fixtureId, "upstream").getByText("Hello JSONUI")).toBeVisible();
  await expect(renderer(page, fixtureId, "unifold")).toBeEmpty();
  expect(await emittedEventCount(page, fixtureId)).toBe(0);
}

const unsupportedCode = JsonUiProfileDiagnosticCode.UnsupportedFeature;
const officialProfileDiagnostics = [
  { code: unsupportedCode, feature: JsonUiFeature.StableNodeId, path: "/view/id" },
  { code: unsupportedCode, feature: JsonUiFeature.StableNodeId, path: "/view/$children/0/id" },
  {
    code: unsupportedCode,
    feature: JsonUiFeature.PrimitiveChild,
    path: "/view/$children/0/$children"
  },
  { code: unsupportedCode, feature: JsonUiFeature.StableNodeId, path: "/view/$children/1/id" },
  { code: unsupportedCode, feature: JsonUiFeature.StorePathBinding, path: "/view/$children/1" }
];

async function parityResult(
  page: import("@playwright/test").Page,
  id: string
): Promise<ParityCaseResult> {
  return page.evaluate((caseId) => {
    const result = window.__jsonUiParity.cases[caseId];
    if (result === undefined) throw new Error(`Parity result is missing: ${caseId}.`);
    return result;
  }, id);
}

async function upstreamTree(page: import("@playwright/test").Page, id: string) {
  return upstreamNodes(page, id).evaluateAll((nodes) =>
    nodes.map((node) => ({
      childIds: [...node.children]
        .filter((child) => child.hasAttribute("data-parity-node"))
        .map((child) => child.getAttribute("data-parity-id")),
      id: node.getAttribute("data-parity-id"),
      properties: JSON.parse(node.getAttribute("data-parity-properties") ?? "{}"),
      type: node.getAttribute("data-parity-type")
    }))
  );
}

function upstreamNodes(page: import("@playwright/test").Page, id: string) {
  return renderer(page, id, "upstream").locator("[data-parity-node='true']");
}

async function unifoldNodeIds(page: import("@playwright/test").Page, id: string) {
  return renderer(page, id, "unifold")
    .locator("[data-unifold-node-id]")
    .evaluateAll((nodes) => nodes.map((node) => (node as HTMLElement).dataset["unifoldNodeId"]));
}

async function assertVisibleText(
  page: import("@playwright/test").Page,
  id: string,
  nodes: ParityCaseResult["expected"]
): Promise<void> {
  for (const node of nodes) {
    const content = node.properties["content"];
    if (typeof content !== "string") continue;
    await expect(renderer(page, id, "upstream").getByText(content, { exact: true })).toBeVisible();
    await expect(renderer(page, id, "unifold").getByText(content, { exact: true })).toBeVisible();
  }
}

async function assertControlValues(
  page: import("@playwright/test").Page,
  id: string,
  nodes: ParityCaseResult["expected"]
): Promise<void> {
  for (const node of nodes) {
    const value = node.properties["value"];
    if (typeof value !== "string") continue;
    await expect(upstreamNodes(page, id).locator("input")).toHaveValue(value);
    await expect(unifoldControl(page, id, node.id)).toHaveValue(value);
  }
}

function unifoldControl(page: import("@playwright/test").Page, id: string, nodeId: string) {
  return renderer(page, id, "unifold")
    .locator(`[data-unifold-node-id="${nodeId}"]`)
    .locator("input");
}

async function emittedEventCount(page: import("@playwright/test").Page, id: string) {
  return Number(await renderer(page, id, "unifold").getAttribute("data-parity-event-count"));
}

function renderer(page: import("@playwright/test").Page, id: string, kind: string) {
  return page.locator(`[data-parity-case="${id}"] [data-parity-renderer="${kind}"]`);
}
