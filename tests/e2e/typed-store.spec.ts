import type { Page } from "@playwright/test";
import { expect, test } from "@unislang/unifold-playwright";

test("hydrates, writes, and follows the active typed store binding", async ({ page }) => {
  await page.goto("/");
  expect(await mountStoreFixture(page)).toMatchObject({ childCount: 1, status: "mounted" });
  const field = page.getByLabel("Stored name");
  await expect(field).toHaveValue("Ada");
  const baseline = await observeStoreFixture(page);
  await field.fill("Grace");
  await expect
    .poll(async () => (await observeStoreFixture(page)).snapshot)
    .toEqual({
      primary: "Grace",
      secondary: "Katherine"
    });
  expect(await updateStorePath(page, "/secondary")).toBe("applied");
  await field.fill("Hopper");
  await expect
    .poll(async () => (await observeStoreFixture(page)).snapshot)
    .toEqual({
      primary: "Grace",
      secondary: "Hopper"
    });
  const observation = await observeStoreFixture(page);
  expect(observation.siblingRetained).toBe(true);
  expect(observation.siblingRenderCount).toBe(baseline.siblingRenderCount);
  await expect(field).toHaveValue("Hopper");
});

test("rejects missing and invalid adapters without partial UI", async ({ page }) => {
  await page.goto("/");
  for (const mode of Object.values(StoreRejectMode)) {
    const observation = await rejectStoreFixture(page, mode);
    expect(observation.status).toBe("rejected");
    expect(observation.childCount).toBe(0);
    expect(observation.diagnostics[0]?.stage).toBe("store");
  }
});

function mountStoreFixture(page: Page): Promise<StoreMountObservation> {
  return page.evaluate(() => {
    const hooks = (window as unknown as StoreWindow).__unifoldStoreFixture;
    if (hooks === undefined) throw new Error("The store fixture hooks are unavailable.");
    return hooks.mount();
  });
}

function observeStoreFixture(page: Page): Promise<StoreObservation> {
  return page.evaluate(() => {
    const hooks = (window as unknown as StoreWindow).__unifoldStoreFixture;
    if (hooks === undefined) throw new Error("The store fixture hooks are unavailable.");
    return hooks.observe();
  });
}

function updateStorePath(page: Page, path: string): Promise<string> {
  return page.evaluate((nextPath) => {
    const hooks = (window as unknown as StoreWindow).__unifoldStoreFixture;
    if (hooks === undefined) throw new Error("The store fixture hooks are unavailable.");
    return hooks.updatePath(nextPath);
  }, path);
}

function rejectStoreFixture(page: Page, mode: StoreRejectMode): Promise<StoreMountObservation> {
  return page.evaluate((failureMode) => {
    const hooks = (window as unknown as StoreWindow).__unifoldStoreFixture;
    if (hooks === undefined) throw new Error("The store fixture hooks are unavailable.");
    return hooks.reject(failureMode);
  }, mode);
}

interface StoreFixtureHooks {
  mount(): StoreMountObservation;
  observe(): StoreObservation;
  reject(mode: StoreRejectMode): StoreMountObservation;
  updatePath(path: string): string;
}

interface StoreMountObservation {
  readonly childCount: number;
  readonly diagnostics: readonly { readonly stage: string }[];
  readonly status: string;
}

interface StoreObservation {
  readonly siblingRenderCount?: string;
  readonly siblingRetained: boolean;
  readonly snapshot: unknown;
}

enum StoreRejectMode {
  Invalid = "invalid",
  Missing = "missing"
}

interface StoreWindow {
  readonly __unifoldStoreFixture?: StoreFixtureHooks;
}
