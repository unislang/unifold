import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

import { expect, test } from "@playwright/test";

const documentId = "static-export-reference";
const semanticsSelector = "script[data-unifold-semantics]";
const nameNodeSelector = '[data-unifold-node-id="name"]';

test("serves the exporter bytes without bootstrap mutation", async ({ request }) => {
  const expected = await readFile(new URL("./index.html", import.meta.url), "utf8");
  const response = await request.get("/");
  const manifestResponse = await request.get("/unifold-manifest.json");
  const manifest = (await manifestResponse.json()) as StaticManifest;
  expect(response.ok()).toBe(true);
  const html = await response.text();
  expect(html).toBe(expected);
  expect(manifestResponse.ok()).toBe(true);
  expect(manifest.sha256).toBe(createHash("sha256").update(html).digest("hex"));
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("keeps the complete native fallback usable and semantic", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Static profile" })).toBeVisible();
    await expect(page.getByLabel("Name")).toHaveValue("Ada Lovelace");
    await expect(page.getByRole("button", { name: "Save profile" })).toBeVisible();
    await expect(page.getByText("Account actions", { exact: true })).toBeVisible();
    await page.getByText("Account actions", { exact: true }).click();
    await expect(page.getByRole("button", { name: "Archive account" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Delete account" })).toBeDisabled();
    await expect(page.getByRole("button", { name: "About account actions" })).toBeVisible();
    await expect(page.getByRole("tooltip")).toHaveText(
      "Account actions apply to the current profile."
    );
    await expect(page.locator(`[data-unifold-static-document="${documentId}"]`)).toHaveCount(1);
    await expect(page.locator("[data-unifold-node-id]")).toHaveCount(0);
    await expect(page.locator(semanticsSelector)).toHaveCount(1);
  });
});

test("migrates edited state, focus, and JSON-LD in one safe upgrade", async ({ page }) => {
  const errors = captureBrowserErrors(page);
  await page.goto("/");
  const staticName = page.getByLabel("Name");
  await staticName.fill("Grace Hopper");
  await staticName.focus();
  await observeSemanticCount(page);
  await loadUpgrade(page);
  await expect.poll(() => upgradeStatus(page)).toBe("mounted");
  await expect(page.locator(nameNodeSelector)).toHaveCount(1);
  await expect(page.getByLabel("Name")).toHaveValue("Grace Hopper");
  await expect(page.getByLabel("Name")).toBeFocused();
  await expect(page.locator("[data-unifold-static-document]")).toHaveCount(0);
  await expect(page.locator(semanticsSelector)).toHaveCount(1);
  await expect.poll(() => semanticName(page)).toBe("Grace Hopper");
  expect(await maxSemanticCount(page)).toBe(1);
  expect(errors).toEqual([]);
});

test("upgrades the static menu into one canonical keyboard action", async ({ page }) => {
  await page.goto("/?upgrade=manual");
  await loadUpgrade(page);
  await invokeUpgrade(page);
  await clearEvents(page);
  const trigger = page.getByRole("button", { exact: true, name: "Account actions" });
  await trigger.press("ArrowUp");
  await expect(page.getByRole("menuitem", { name: "Archive account" })).toBeFocused();
  await page.getByRole("menuitem", { name: "Archive account" }).press("Enter");
  await expect(trigger).toBeFocused();
  expect(await eventTypes(page)).toEqual(["org.unifold.ui.component.activated.v1"]);
});

test("upgrades static Tooltip help into one dismissible top-layer interaction", async ({
  page
}) => {
  await page.goto("/?upgrade=manual");
  await loadUpgrade(page);
  await invokeUpgrade(page);
  const trigger = page.getByRole("button", { name: "About account actions" });
  const tooltip = page.getByRole("tooltip");
  await trigger.focus();
  await expect(tooltip).toBeVisible();
  await trigger.press("Escape");
  await expect(tooltip).toBeHidden();
  await expect(trigger).toBeFocused();
});

test("does not duplicate mounts or canonical events", async ({ page }) => {
  await page.goto("/?upgrade=manual");
  await loadUpgrade(page);
  await invokeUpgrade(page);
  await invokeUpgrade(page);
  await clearEvents(page);
  await page.getByLabel("Name").fill("Katherine Johnson");
  await expect.poll(() => eventCount(page, "org.unifold.ui.transaction.committed.v1")).toBe(1);
  expect(await eventTypes(page)).toEqual([
    "org.unifold.ui.control.input.v1",
    "org.unifold.ui.command.applied.v1",
    "org.unifold.ui.transaction.committed.v1"
  ]);
  expect(await eventTimeline(page)).toEqual({
    revisions: [0, 1, 1],
    sequences: [1, 2, 3]
  });
  expect(await eventIdsAreUnique(page)).toBe(true);
  await expect(page.locator(nameNodeSelector)).toHaveCount(1);
});

test("rejects structural tampering without replacing the fallback", async ({ page }) => {
  await page.goto("/?upgrade=manual");
  const original = page.getByLabel("Name");
  await original.fill("Fallback retained");
  await original.evaluate((element) => (window.__unifoldStaticFallback = element));
  await tamperStaticComponent(page);
  await loadUpgrade(page);
  const result = await invokeUpgrade(page);
  expect(result).toMatchObject({ diagnostics: [{ stage: "renderer" }], status: "rejected" });
  await expect(original).toHaveValue("Fallback retained");
  await expect(original).toBeFocused();
  expect(await staticFallbackRetained(page)).toBe(true);
  await expect(page.locator("[data-unifold-node-id]")).toHaveCount(0);
  await expect(page.locator(semanticsSelector)).toHaveCount(1);
});

test("rejects a foreign semantic owner without changing the page", async ({ page }) => {
  await page.goto("/?upgrade=manual");
  await page.locator(semanticsSelector).evaluate((element) => {
    window.__unifoldStaticSemantic = element;
    element.setAttribute("data-unifold-semantics", "foreign-owner");
  });
  await loadUpgrade(page);
  const result = await invokeUpgrade(page);
  expect(result).toMatchObject({ diagnostics: [{ stage: "semantics" }], status: "rejected" });
  await expect(page.getByLabel("Name")).toHaveValue("Ada Lovelace");
  await expect(page.locator('[data-unifold-semantics="foreign-owner"]')).toHaveCount(1);
  expect(await staticSemanticRetained(page)).toBe(true);
  await expect(page.locator("[data-unifold-node-id]")).toHaveCount(0);
});

type TestPage = Parameters<typeof loadUpgrade>[0];

async function loadUpgrade(page: import("@playwright/test").Page): Promise<void> {
  await page.addScriptTag({ type: "module", url: "/upgrade.js" });
  await expect.poll(() => hasUpgradeHook(page)).toBe(true);
}

async function hasUpgradeHook(page: import("@playwright/test").Page): Promise<boolean> {
  return page.evaluate(() => typeof window.__unifoldUpgradeStatic === "function");
}

async function invokeUpgrade(page: TestPage): Promise<StaticUpgradeResult> {
  return page.evaluate(() => window.__unifoldUpgradeStatic());
}

async function upgradeStatus(page: TestPage): Promise<string | undefined> {
  return page.evaluate(() => window.__unifoldStaticResult?.status);
}

async function semanticName(page: TestPage): Promise<string | undefined> {
  return page.locator(semanticsSelector).evaluate((element) => {
    const graph = JSON.parse(element.textContent ?? "{}") as SemanticGraph;
    return graph["@graph"][0]?.name;
  });
}

async function clearEvents(page: TestPage): Promise<void> {
  await page.evaluate(() => window.__unifoldStaticEvents.splice(0));
}

async function eventCount(page: TestPage, type: string): Promise<number> {
  return page.evaluate((expected) => {
    return window.__unifoldStaticEvents.filter((event) => event.type === expected).length;
  }, type);
}

async function eventTypes(page: TestPage): Promise<string[]> {
  return page.evaluate(() => window.__unifoldStaticEvents.map((event) => event.type));
}

async function eventIdsAreUnique(page: TestPage): Promise<boolean> {
  return page.evaluate(() => {
    const ids = window.__unifoldStaticEvents.map((event) => event.id);
    return new Set(ids).size === ids.length;
  });
}

async function eventTimeline(page: TestPage): Promise<EventTimeline> {
  return page.evaluate(() => ({
    revisions: window.__unifoldStaticEvents.map((event) => event.staterevision),
    sequences: window.__unifoldStaticEvents.map((event) => event.sequence)
  }));
}

async function observeSemanticCount(page: TestPage): Promise<void> {
  await page.evaluate(() => {
    window.__unifoldMaxSemanticCount = document.querySelectorAll(
      "script[data-unifold-semantics]"
    ).length;
    const observer = new MutationObserver(() => {
      const count = document.querySelectorAll("script[data-unifold-semantics]").length;
      window.__unifoldMaxSemanticCount = Math.max(window.__unifoldMaxSemanticCount, count);
    });
    observer.observe(document.head, { attributes: true, childList: true, subtree: true });
  });
}

async function maxSemanticCount(page: TestPage): Promise<number> {
  return page.evaluate(() => window.__unifoldMaxSemanticCount);
}

function captureBrowserErrors(page: TestPage): string[] {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  return errors;
}

async function staticFallbackRetained(page: TestPage): Promise<boolean> {
  return page.evaluate(() => window.__unifoldStaticFallback === document.activeElement);
}

async function staticSemanticRetained(page: TestPage): Promise<boolean> {
  return page.evaluate(() => window.__unifoldStaticSemantic?.isConnected === true);
}

async function tamperStaticComponent(page: TestPage): Promise<void> {
  await page.locator('[data-unifold-static-node-id="name"]').evaluate((element) => {
    element.setAttribute("data-unifold-static-component", "TextArea");
  });
}

interface SemanticGraph {
  readonly "@graph": readonly { readonly name?: string }[];
}

interface StaticManifest {
  readonly sha256: string;
}

interface EventTimeline {
  readonly revisions: readonly number[];
  readonly sequences: readonly number[];
}

interface StaticUpgradeResult {
  readonly diagnostics: readonly { readonly stage: string }[];
  readonly status: string;
}

declare global {
  interface Window {
    __unifoldMaxSemanticCount: number;
    __unifoldStaticFallback?: Element;
    __unifoldStaticEvents: {
      readonly id: string;
      readonly sequence: number;
      readonly staterevision: number;
      readonly type: string;
    }[];
    __unifoldStaticResult?: StaticUpgradeResult;
    __unifoldStaticSemantic?: Element;
    __unifoldUpgradeStatic(): StaticUpgradeResult;
  }
}
