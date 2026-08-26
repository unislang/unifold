import { expect, readRenderBaseline, test } from "@unislang/unifold-playwright";

import { hierarchicalLayoutDocument } from "./hierarchical-layout.test-data.js";
import type { DynamicUpdateResult, DynamicWindow } from "./reference.types.js";

type ScenarioPage = Parameters<typeof readRenderBaseline>[0];

test("lowers a hierarchical layout and routes its child event binding", async ({ page }) => {
  await page.goto("/");
  await waitForReference(page);
  const result = await applyHierarchicalLayout(page);
  expect(result.status, JSON.stringify(result)).toBe("applied");

  await expect(nodeHost(page, "layout-page")).toHaveCount(1);
  await expect(nodeHost(page, "layout-form").locator(nodeSelector("layout-actions"))).toHaveCount(
    1
  );
  await page.getByRole("button", { name: "Show details" }).click();
  await expect(page.getByText("Details open", { exact: true })).toBeVisible();
});

test("rejects an invalid hierarchy and retains the last-known-good UI", async ({ page }) => {
  await page.goto("/");
  await waitForReference(page);
  expect((await applyHierarchicalLayout(page)).status).toBe("applied");
  await page.getByRole("button", { name: "Show details" }).click();
  await expect(page.getByText("Details open", { exact: true })).toBeVisible();
  const button = nodeHost(page, "layout-details");
  const renderCount = await button.getAttribute("data-unifold-render-count");
  const invalid = structuredClone(hierarchicalLayoutDocument);
  invalid.revision = "layout-2";
  const firstField = invalid.variables.fields[0];
  if (firstField === undefined) throw new Error("Hierarchical field fixture is missing.");
  firstField.type = "MissingComponent";
  const result = await applyHierarchicalLayout(page, invalid);
  expect(result.status).toBe("rejected");
  expect(result.diagnostics).toEqual(
    expect.arrayContaining([expect.objectContaining({ path: "/variables/fields/0/type" })])
  );
  await expect(button).toHaveAttribute("data-unifold-render-count", renderCount ?? "1");
  await expect(page.getByText("Details open", { exact: true })).toBeVisible();
});

async function applyHierarchicalLayout(
  page: ScenarioPage,
  document: unknown = hierarchicalLayoutDocument
): Promise<DynamicUpdateResult> {
  return page.evaluate((document) => {
    const target = window as unknown as DynamicWindow;
    return target.__unifoldUpdateDocument(document);
  }, document);
}

function nodeHost(page: ScenarioPage, nodeId: string) {
  return page.locator(nodeSelector(nodeId));
}

function nodeSelector(nodeId: string): string {
  return `[data-unifold-node-id="${nodeId}"]`;
}

async function waitForReference(page: ScenarioPage): Promise<void> {
  await page.waitForFunction(() => {
    const target = window as unknown as Partial<DynamicWindow>;
    return typeof target.__unifoldUpdateDocument === "function";
  });
}
