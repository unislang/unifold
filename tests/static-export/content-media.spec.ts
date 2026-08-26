import { expect, test, type Page } from "@playwright/test";

const imageName = "Blue and green geometric profile placeholder";

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("exports native Image and Card content", async ({ page }) => {
    await page.goto("/");
    await assertContentMedia(page);
    await expect(page.locator("[data-unifold-node-id]")).toHaveCount(0);
  });
});

test("upgrades static Image and Card without duplicate content or events", async ({ page }) => {
  await page.goto("/?upgrade=manual");
  await page.addScriptTag({ type: "module", url: "/upgrade.js" });
  await expect.poll(() => hasUpgradeHook(page)).toBe(true);
  await page.evaluate(() => window.__unifoldUpgradeStatic());
  await page.evaluate(() => window.__unifoldStaticEvents.splice(0));
  await assertContentMedia(page);
  expect(
    await page.evaluate(() => window.__unifoldStaticEvents.map((event) => event.type))
  ).toEqual([]);
});

async function assertContentMedia(page: Page): Promise<void> {
  await expect(page.getByRole("article", { name: "Profile media summary" })).toHaveCount(1);
  await expect(page.getByText("This card remains visible without JavaScript.")).toHaveCount(1);
  const image = page.getByRole("img", { name: imageName });
  await expect(image).toHaveCount(1);
  await expect(image).toHaveAttribute("src", "/profile-placeholder.svg");
  await expect(image).toHaveAttribute("width", "320");
  await expect(image).toHaveAttribute("height", "180");
}

async function hasUpgradeHook(page: Page): Promise<boolean> {
  return page.evaluate(() => typeof window.__unifoldUpgradeStatic === "function");
}
