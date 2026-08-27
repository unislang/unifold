import { expect, test, type Locator, type Page } from "@playwright/test";

const TOAST_ID = "profile-ready-toast";

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("keeps persistent Toast announcements visible without inert controls", async ({ page }) => {
    await page.goto("/");
    const ready = staticToast(page, TOAST_ID);
    const warning = staticToast(page, "security-warning-toast");
    await expect(ready.getByRole("status")).toContainText("Profile ready");
    await expect(ready.getByRole("status")).toContainText(
      "Your profile changes are ready to review."
    );
    await expect(warning.getByRole("alert")).toContainText("Security warning");
    await expect(ready.getByRole("button")).toHaveCount(0);
    await expect(warning.getByRole("button")).toHaveCount(0);
  });
});

test("upgrades Toast semantics and captures only trusted manual dismissal", async ({ page }) => {
  await page.goto("/?upgrade=manual");
  await installUpgrade(page);
  const host = upgradedToast(page, TOAST_ID);
  await expect(host.getByRole("status")).toContainText("Profile ready");
  await expect(host.getByRole("button", { name: "Dismiss profile notification" })).toBeVisible();
  await expect(upgradedToast(page, "security-warning-toast").getByRole("alert")).toBeVisible();
  await expect(upgradedToast(page, "security-warning-toast").getByRole("button")).toHaveCount(0);
  await clearEvents(page);
  await host.getByRole("button", { name: "Dismiss profile notification" }).click();
  await expect.poll(() => latestDismissal(page)).toEqual({ dismissed: true, reason: "manual" });
  await expect(host.getByRole("status")).toBeVisible();
});

test("rejects tampered Toast live-region semantics without replacing fallback", async ({
  page
}) => {
  await page.goto("/?upgrade=manual");
  const fallback = staticToast(page, TOAST_ID);
  await fallback
    .locator("[data-unifold-static-toast-announcement]")
    .evaluate((element) => element.setAttribute("role", "alert"));
  await expectRejectedUpgrade(page);
  await expect(fallback.getByRole("alert")).toBeVisible();
  await expect(upgradedToast(page, TOAST_ID)).toHaveCount(0);
});

test("rejects tampered Toast content without replacing fallback", async ({ page }) => {
  await page.goto("/?upgrade=manual");
  const fallback = staticToast(page, TOAST_ID);
  await fallback.locator("span").evaluate((element) => {
    element.textContent = "Injected notification";
  });
  await expectRejectedUpgrade(page);
  await expect(fallback).toContainText("Injected notification");
  await expect(upgradedToast(page, TOAST_ID)).toHaveCount(0);
});

function staticToast(page: Page, id: string): Locator {
  return page.locator(`[data-unifold-static-node-id="${id}"]`);
}

function upgradedToast(page: Page, id: string): Locator {
  return page.locator(`unifold-toast[data-unifold-node-id="${id}"]`);
}

async function expectRejectedUpgrade(page: Page): Promise<void> {
  await installUpgradeScript(page);
  const result = await page.evaluate(() => window.__unifoldUpgradeStatic());
  expect(result).toMatchObject({ diagnostics: [{ stage: "renderer" }], status: "rejected" });
}

async function installUpgrade(page: Page): Promise<void> {
  await installUpgradeScript(page);
  const result = await page.evaluate(() => window.__unifoldUpgradeStatic());
  expect(result).toMatchObject({ diagnostics: [], status: "mounted" });
}

async function installUpgradeScript(page: Page): Promise<void> {
  await page.addScriptTag({ type: "module", url: "/upgrade.js" });
  await expect
    .poll(() => page.evaluate(() => typeof window.__unifoldUpgradeStatic))
    .toBe("function");
}

async function clearEvents(page: Page): Promise<void> {
  await page.evaluate(() => window.__unifoldStaticEvents.splice(0));
}

async function latestDismissal(page: Page): Promise<unknown> {
  return page.evaluate((toastId) => {
    const event = [...window.__unifoldStaticEvents]
      .reverse()
      .find(({ data, type }) =>
        [
          type === "org.unifold.ui.component.activated.v1",
          Reflect.get(Object(Reflect.get(Object(data), "sourceNode")), "id") === toastId
        ].every(Boolean)
      );
    return event?.data.change;
  }, TOAST_ID);
}
