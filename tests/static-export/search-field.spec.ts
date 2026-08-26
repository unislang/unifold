import { expect, test, type Locator, type Page } from "@playwright/test";

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("exports a native SearchField fallback", async ({ page }) => {
    await page.goto("/");
    const search = page.getByLabel("Search profiles");
    await expect(search).toHaveAttribute("type", "search");
    await expect(search).toHaveAttribute("autocomplete", "off");
    await expect(search).toHaveAttribute("enterkeyhint", "search");
    await expect(search).toHaveAttribute("maxlength", "2048");
    await expect(search).toHaveValue("Ada");
    expect(await submittedQuery(search)).toBe("Ada");
  });
});

test("migrates an edited static SearchField as scalar canonical state", async ({ page }) => {
  await page.goto("/?upgrade=manual");
  const fallback = page.getByLabel("Search profiles");
  await fallback.fill("Grace");
  await fallback.focus();
  await installUpgrade(page);
  const search = page.getByLabel("Search profiles");
  await expect(search).toHaveValue("Grace");
  await expect(search).toBeFocused();
  await expect(page.locator('[data-unifold-node-id="profile-search"]')).toHaveCount(1);
  expect(await submittedQuery(search)).toBe("Grace");
  await clearEvents(page);
  await search.fill("Katherine");
  await expect.poll(() => latestSearchValue(page)).toBe("Katherine");
});

test("rejects a tampered non-search fallback without replacing it", async ({ page }) => {
  await page.goto("/?upgrade=manual");
  const fallback = page.getByLabel("Search profiles");
  await fallback.evaluate((element) => ((element as HTMLInputElement).type = "text"));
  await installUpgradeScript(page);
  const result = await page.evaluate(() => window.__unifoldUpgradeStatic());
  expect(result).toMatchObject({ diagnostics: [{ stage: "renderer" }], status: "rejected" });
  await expect(fallback).toHaveAttribute("type", "text");
  await expect(page.locator('[data-unifold-node-id="profile-search"]')).toHaveCount(0);
});

async function installUpgrade(page: Page): Promise<void> {
  await installUpgradeScript(page);
  await page.evaluate(() => window.__unifoldUpgradeStatic());
}

async function installUpgradeScript(page: Page): Promise<void> {
  await page.addScriptTag({ type: "module", url: "/upgrade.js" });
  await expect
    .poll(() => page.evaluate(() => typeof window.__unifoldUpgradeStatic))
    .toBe("function");
}

async function submittedQuery(control: Locator): Promise<string | null> {
  return control.evaluate((element) => {
    const root = element.getRootNode();
    const form =
      root instanceof ShadowRoot
        ? (root.host as HTMLElement & { readonly form: HTMLFormElement | null }).form
        : (element as HTMLInputElement).form;
    return form === null ? null : String(new FormData(form).get("profileSearch"));
  });
}

async function clearEvents(page: Page): Promise<void> {
  await page.evaluate(() => window.__unifoldStaticEvents.splice(0));
}

async function latestSearchValue(page: Page): Promise<unknown> {
  return page.evaluate(() => {
    const event = [...window.__unifoldStaticEvents]
      .reverse()
      .find(({ type }) => type === "org.unifold.ui.control.input.v1");
    const change = event?.data.change;
    return (Object(change) as Record<string, unknown>)["value"];
  });
}
