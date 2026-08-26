import { expect, test } from "@playwright/test";

test("upgrades the static file picker with metadata-only canonical state", async ({ page }) => {
  await page.goto("/?upgrade=manual");
  await page.addScriptTag({ type: "module", url: "/upgrade.js" });
  await expect.poll(() => hasUpgradeHook(page)).toBe(true);
  await page.evaluate(() => window.__unifoldUpgradeStatic());
  await page.evaluate(() => window.__unifoldStaticEvents.splice(0));
  await page.getByLabel("Attachments").setInputFiles({
    buffer: Buffer.from("local bytes stay outside JSON"),
    mimeType: "application/pdf",
    name: "static-evidence.pdf"
  });
  const events = await page.evaluate(() => window.__unifoldStaticEvents);
  const input = events.find((event) => event.type === "org.unifold.ui.control.input.v1");
  expect(input?.data.change).toEqual({
    rejectedCount: 0,
    value: [
      {
        id: expect.stringMatching(/^[0-9a-f-]{36}$/u),
        size: 29,
        type: "application/pdf"
      }
    ],
    selectedCount: 1
  });
  expect(JSON.stringify(events)).not.toContain("local bytes stay outside JSON");
  expect(JSON.stringify(events)).not.toContain("static-evidence.pdf");
  expect(JSON.stringify(events)).not.toContain("lastModified");
});

function hasUpgradeHook(page: import("@playwright/test").Page): Promise<boolean> {
  return page.evaluate(() => typeof window.__unifoldUpgradeStatic === "function");
}
