import { expect, test, type Locator, type Page } from "@playwright/test";

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("exports a native Switch fallback", async ({ page }) => {
    await page.goto("/");
    const control = page.getByRole("switch", { name: "Enable notifications" });
    await expect(control).toHaveAttribute("type", "checkbox");
    await expect(control).toBeChecked();
    expect(await submittedNotification(control)).toBe("on");
  });
});

test("migrates an edited Switch as boolean canonical state", async ({ page }) => {
  await page.goto("/?upgrade=manual");
  const fallback = page.getByRole("switch", { name: "Enable notifications" });
  await fallback.uncheck();
  await fallback.focus();
  await installUpgrade(page);
  const control = page.getByRole("switch", { name: "Enable notifications" });
  await expect(control).not.toBeChecked();
  await expect(control).toBeFocused();
  await expect(page.locator('[data-unifold-node-id="notifications"]')).toHaveCount(1);
  expect(await submittedNotification(control)).toBeNull();
  await clearEvents(page);
  await control.check();
  await expect.poll(() => latestSwitchValue(page)).toBe(true);
  expect(await submittedNotification(control)).toBe("on");
});

test("rejects a tampered Switch role without replacing the fallback", async ({ page }) => {
  await page.goto("/?upgrade=manual");
  const fallback = page.getByLabel("Enable notifications");
  await fallback.evaluate((element) => element.setAttribute("role", "checkbox"));
  await installUpgradeScript(page);
  const result = await page.evaluate(() => window.__unifoldUpgradeStatic());
  expect(result).toMatchObject({ diagnostics: [{ stage: "renderer" }], status: "rejected" });
  await expect(fallback).toHaveAttribute("role", "checkbox");
  await expect(page.locator('[data-unifold-node-id="notifications"]')).toHaveCount(0);
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

async function submittedNotification(control: Locator): Promise<string | null> {
  return control.evaluate((element) => {
    const root = element.getRootNode();
    const form = Reflect.get(
      root instanceof ShadowRoot ? root.host : element,
      "form"
    ) as HTMLFormElement | null;
    if (form === null) throw new Error("Switch form owner is missing.");
    return new FormData(form).get("notifications") as string | null;
  });
}

async function clearEvents(page: Page): Promise<void> {
  await page.evaluate(() => window.__unifoldStaticEvents.splice(0));
}

async function latestSwitchValue(page: Page): Promise<unknown> {
  return page.evaluate(() => {
    const event = [...window.__unifoldStaticEvents]
      .reverse()
      .find(
        ({ data, type }) =>
          type === "org.unifold.ui.control.input.v1" &&
          Reflect.get(Object(Reflect.get(Object(data), "sourceNode")), "id") === "notifications"
      );
    return Reflect.get(Object(event?.data.change), "value") as unknown;
  });
}
