import { expect, test, type Locator, type Page } from "@playwright/test";

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("exports a native CheckboxGroup fallback with repeated form values", async ({ page }) => {
    await page.goto("/");
    const news = page.getByLabel("Product news");
    const security = page.getByLabel("Security alerts");
    await expect(news).toHaveAttribute("type", "checkbox");
    await expect(news).toBeChecked();
    await expect(security).not.toBeChecked();
    await expect(page.getByLabel("Internal updates")).toBeDisabled();
    expect(await submittedValues(news, "topics")).toEqual(["news"]);
  });
});

test("migrates edited CheckboxGroup state as one canonical repeated value", async ({ page }) => {
  await page.goto("/?upgrade=manual");
  const fallbackNews = page.getByLabel("Product news");
  const fallbackSecurity = page.getByLabel("Security alerts");
  await fallbackNews.uncheck();
  await fallbackSecurity.check();
  await fallbackSecurity.focus();
  await installUpgrade(page);

  const group = page.locator('[data-unifold-node-id="profile-topics"]');
  const news = page.getByLabel("Product news");
  const security = page.getByLabel("Security alerts");
  await expect(news).not.toBeChecked();
  await expect(security).toBeChecked();
  await expect(security).toBeFocused();
  await expect(group).toHaveCount(1);
  expect(await submittedValues(security, "topics")).toEqual(["security"]);
  await clearEvents(page);
  await news.check();
  await expect.poll(() => latestCheckboxGroupValue(page)).toEqual(["news", "security"]);
});

test("rejects a tampered CheckboxGroup option without replacing the fallback", async ({ page }) => {
  await page.goto("/?upgrade=manual");
  const fallback = page.getByLabel("Security alerts");
  await fallback.evaluate((element) => ((element as HTMLInputElement).value = "tampered"));
  await installUpgradeScript(page);
  const result = await page.evaluate(() => window.__unifoldUpgradeStatic());
  expect(result).toMatchObject({ diagnostics: [{ stage: "renderer" }], status: "rejected" });
  await expect(fallback).toHaveAttribute("value", "tampered");
  await expect(page.locator('[data-unifold-node-id="profile-topics"]')).toHaveCount(0);
});

test("rejects a checked disabled CheckboxGroup option without replacing the fallback", async ({
  page
}) => {
  await page.goto("/?upgrade=manual");
  const fallback = page.getByLabel("Internal updates");
  await fallback.evaluate((element) => ((element as HTMLInputElement).checked = true));
  await installUpgradeScript(page);
  const result = await page.evaluate(() => window.__unifoldUpgradeStatic());
  expect(result).toMatchObject({ diagnostics: [{ stage: "renderer" }], status: "rejected" });
  await expect(fallback).toBeChecked();
  await expect(fallback).toBeDisabled();
  await expect(page.locator('[data-unifold-node-id="profile-topics"]')).toHaveCount(0);
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

async function submittedValues(control: Locator, name: string): Promise<readonly string[]> {
  return control.evaluate((element, fieldName) => {
    const root = element.getRootNode();
    const form =
      root instanceof ShadowRoot
        ? (root.host as HTMLElement & { readonly form: HTMLFormElement | null }).form
        : (element as HTMLInputElement).form;
    return form === null ? [] : new FormData(form).getAll(fieldName).map(String);
  }, name);
}

async function clearEvents(page: Page): Promise<void> {
  await page.evaluate(() => window.__unifoldStaticEvents.splice(0));
}

async function latestCheckboxGroupValue(page: Page): Promise<unknown> {
  return page.evaluate(() => {
    const event = [...window.__unifoldStaticEvents]
      .reverse()
      .find(({ type }) => type === "org.unifold.ui.control.input.v1");
    const change = event?.data.change;
    return (Object(change) as Record<string, unknown>)["value"];
  });
}
