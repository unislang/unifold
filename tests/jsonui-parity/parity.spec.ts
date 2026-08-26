import { expect, test } from "@playwright/test";
import { JsonUiFeature, JsonUiProfileDiagnosticCode } from "@unislang/unifold-jsonui";

import { PARITY_CASES } from "./src/cases.js";
import { ParityPreparationStatus, type ParityCaseResult } from "./src/types.js";

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
