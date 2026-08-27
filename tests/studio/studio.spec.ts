import { expect, test } from "@unislang/unifold-playwright";
import type { Page } from "@playwright/test";

test("runs JSON-authored request, isolated preview, guarded apply, and export", async ({
  page,
  unifold
}) => {
  await page.goto("/");
  await verifyModuleEvidence(page);
  const prompt = "Make the customer summary concise and welcoming";
  await generatePreview(page, prompt);
  await applyAndExport(page, prompt);
  await unifold.assertAccessibility();
});

async function verifyModuleEvidence(page: Page): Promise<void> {
  const root = page.locator("html");
  await expect(root).toHaveAttribute("data-unifold-control-module-integrity", /^sha256-/u);
  await expect(root).toHaveAttribute("data-unifold-live-module-integrity", /^sha256-/u);
}

async function generatePreview(page: Page, prompt: string): Promise<void> {
  await page.getByLabel("Describe how the preview should change").fill(prompt);
  await page.getByRole("button", { name: "Generate" }).click();
  await expect(
    page.getByText("Isolated preview ready. The live application is unchanged.")
  ).toBeVisible();
  await expect(
    page.getByRole("status").filter({ hasText: "Isolated preview ready" })
  ).toBeVisible();
  await expect(page.locator("#isolated-preview")).toContainText(`Local mock request: ${prompt}`);
  await expect(page.locator("#live-preview")).toContainText(
    "This is the currently applied experience."
  );
  await expect(page.locator("#proposal-diff")).toContainText("/view/$children/1/content");
}

async function applyAndExport(page: Page, prompt: string): Promise<void> {
  await page.getByRole("button", { name: "Apply" }).click();
  await expect(
    page.getByText("Applied to the live application. Export is available.")
  ).toBeVisible();
  await expect(page.getByRole("status").filter({ hasText: "Applied to the live" })).toBeVisible();
  await expect(page.locator("#live-preview")).toContainText(`Local mock request: ${prompt}`);
  await page.getByRole("button", { name: "Export" }).click();
  await expect(page.getByText("Exported portable JSON and standalone static HTML.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Download ui.json" })).toHaveAttribute(
    "download",
    "ui.json"
  );
  await expect(page.getByRole("link", { name: "Download index.html" })).toHaveAttribute(
    "download",
    "index.html"
  );
  await expect(page.locator("#export-output")).toContainText('"@type":"WebPage"');
}

test("supports the complete workflow from the keyboard", async ({ page }) => {
  await page.goto("/");
  const prompt = page.getByLabel("Describe how the preview should change");
  await prompt.fill("Use a clearer keyboard-first summary");
  await prompt.press("Tab");
  await expect(page.getByRole("button", { name: "Generate" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(
    page.getByText("Isolated preview ready. The live application is unchanged.")
  ).toBeVisible();
  await page.getByRole("button", { name: "Apply" }).focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByText("Applied to the live application. Export is available.")
  ).toBeVisible();
});

test("isolates duplicate live and preview identities and disposes only the preview", async ({
  page
}) => {
  await page.goto("/");
  const live = page.locator("#live-preview [data-unifold-node-id='prototype-page']");
  await live.evaluate((element) => element.setAttribute("data-isolation-sentinel", "live"));
  await generatePreview(page, "Prove same-page preview isolation");
  const preview = page.locator("#isolated-preview [data-unifold-node-id='prototype-page']");
  await expect(live).toHaveCount(1);
  await expect(preview).toHaveCount(1);
  await expect(live).toHaveAttribute("data-isolation-sentinel", "live");
  await expect(preview).not.toHaveAttribute("data-isolation-sentinel", "live");
  await page.getByRole("button", { name: "Cancel request" }).click();
  await expect(preview).toHaveCount(0);
  await expect(live).toHaveAttribute("data-isolation-sentinel", "live");
  await page.getByLabel("Describe how the preview should change").fill("Control remains active");
  await expect(page.getByLabel("Describe how the preview should change")).toHaveValue(
    "Control remains active"
  );
});

test("rejects an unsafe proposal without opening or mutating either application", async ({
  page
}) => {
  await page.goto("/");
  await page
    .getByLabel("Describe how the preview should change")
    .fill("Change the stable identity of the prototype page");
  await page.getByRole("button", { name: "Generate" }).click();
  await expect(page.getByText("The local proposal failed validation.")).toBeVisible();
  await expect(page.locator("#proposal-diff")).toContainText("forbidden-path");
  await expect(page.locator("#isolated-preview [data-unifold-node-id]")).toHaveCount(0);
  await expect(page.locator("#live-preview")).toContainText(
    "This is the currently applied experience."
  );
  await expect(page.getByRole("button", { name: "Apply" })).toBeDisabled();
});

test("rejects stale apply and preserves the external live edit", async ({ page }) => {
  await page.goto("/");
  await generatePreview(page, "Clarify the stale summary");
  await page.getByRole("button", { name: "Simulate external edit" }).click();
  await expect(page.locator("#live-preview")).toContainText(
    "This summary was changed outside Studio."
  );
  await page.getByRole("button", { name: "Apply" }).click();
  await expect(page.getByText("The local proposal failed validation.")).toBeVisible();
  await expect(page.locator("#proposal-diff")).toContainText("base-revision-mismatch");
  await expect(page.locator("#isolated-preview [data-unifold-node-id]")).toHaveCount(0);
  await expect(page.locator("#live-preview")).toContainText(
    "This summary was changed outside Studio."
  );
  await expect(page.getByRole("button", { name: "Export" })).toBeEnabled();
});

test("cancels a delayed request without accepting a late candidate", async ({ page }) => {
  await page.goto("/");
  await page
    .getByLabel("Describe how the preview should change")
    .fill("Wait before proposing the customer summary");
  await page.getByRole("button", { name: "Generate" }).click();
  await expect(page.getByText("Generating with the deterministic local mock.")).toBeVisible();
  await page.getByRole("button", { name: "Cancel request" }).click();
  await expect(page.getByText("Studio request cancelled. No candidate was applied.")).toBeVisible();
  await expect(page.locator("#proposal-diff")).toContainText("cancelled");
  await expect(page.locator("#isolated-preview [data-unifold-node-id]")).toHaveCount(0);
  await expect(page.locator("#live-preview")).toContainText(
    "This is the currently applied experience."
  );
  await expect(page.getByRole("button", { name: "Apply" })).toBeDisabled();
});

test("supersedes a delayed request with only the newest preview", async ({ page }) => {
  await page.goto("/");
  const prompt = page.getByLabel("Describe how the preview should change");
  await prompt.fill("Wait before proposing the customer summary");
  await page.getByRole("button", { name: "Generate" }).click();
  await prompt.fill("Use only the newest proposal");
  await page.getByRole("button", { name: "Generate" }).click();
  await expect(page.locator("#isolated-preview")).toContainText(
    "Local mock request: Use only the newest proposal"
  );
  await expect(page.locator("#isolated-preview")).not.toContainText(
    "Wait before proposing the customer summary"
  );
  await expect(page.locator("#live-preview")).toContainText(
    "This is the currently applied experience."
  );
});

test("reports export unavailability without producing a partial artifact", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Export" }).click();
  await expect(page.getByText("Export is unavailable until a proposal is applied.")).toBeVisible();
  await expect(page.locator("#proposal-diff")).toContainText("export-unavailable");
  await expect(page.locator("#export-output a[download]")).toHaveCount(0);
  await expect(page.locator("#live-preview")).toContainText(
    "This is the currently applied experience."
  );
});

test("keeps generated output and provider credentials out of browser assets", async ({ page }) => {
  await page.goto("/");
  const assets = await page
    .locator("script[src]")
    .evaluateAll((scripts) => scripts.map((script) => (script as HTMLScriptElement).src));
  const source = (
    await Promise.all(assets.map((asset) => fetch(asset).then((item) => item.text())))
  ).join("\n");
  expect(source).not.toContain("You are the Unifold UI design proposal engine");
  expect(source).not.toContain("generateText");
  expect(source).not.toMatch(/(?:api[_-]?key|authorization:\s*bearer)/iu);
});
