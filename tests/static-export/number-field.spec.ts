import { expect, test, type Locator, type Page } from "@playwright/test";

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("exports a bounded native NumberField fallback", async ({ page }) => {
    await page.goto("/");
    const age = page.getByLabel("Age", { exact: true });
    await expect(age).toHaveAttribute("type", "number");
    await expect(age).toHaveAttribute("min", "0");
    await expect(age).toHaveAttribute("max", "130");
    await expect(age).toHaveAttribute("step", "1");
    await expect(age).toHaveValue("40");
    expect(await submittedAge(age)).toBe("40");
  });
});

test("migrates an edited static NumberField as numeric canonical state", async ({ page }) => {
  await page.goto("/?upgrade=manual");
  const fallback = page.getByLabel("Age", { exact: true });
  await fallback.fill("42");
  await fallback.focus();
  await installUpgrade(page);
  const age = page.getByLabel("Age", { exact: true });
  await expect(age).toHaveValue("42");
  await expect(age).toBeFocused();
  await expect(page.locator('[data-unifold-node-id="age"]')).toHaveCount(1);
  expect(await submittedAge(age)).toBe("42");
  await clearEvents(page);
  await age.fill("43");
  await expect.poll(() => latestNumberValue(page)).toBe(43);
});

test("rejects an off-step static NumberField value without replacing the fallback", async ({
  page
}) => {
  await page.goto("/?upgrade=manual");
  const fallback = page.getByLabel("Age", { exact: true });
  await fallback.fill("42.5");
  await installUpgradeScript(page);
  const result = await page.evaluate(() => window.__unifoldUpgradeStatic());
  expect(result).toMatchObject({ diagnostics: [{ stage: "renderer" }], status: "rejected" });
  await expect(fallback).toHaveValue("42.5");
  await expect(page.locator("[data-unifold-node-id]")).toHaveCount(0);
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

async function submittedAge(control: Locator): Promise<string | null> {
  return control.evaluate((element) => {
    const root = element.getRootNode();
    const form =
      root instanceof ShadowRoot
        ? (root.host as HTMLElement & { readonly form: HTMLFormElement | null }).form
        : (element as HTMLInputElement).form;
    return form === null ? null : String(new FormData(form).get("age"));
  });
}

async function clearEvents(page: Page): Promise<void> {
  await page.evaluate(() => window.__unifoldStaticEvents.splice(0));
}

async function latestNumberValue(page: Page): Promise<unknown> {
  return page.evaluate(() => {
    const event = [...window.__unifoldStaticEvents]
      .reverse()
      .find(({ type }) => type === "org.unifold.ui.control.input.v1");
    const change = event?.data.change;
    return (Object(change) as Record<string, unknown>)["value"];
  });
}
