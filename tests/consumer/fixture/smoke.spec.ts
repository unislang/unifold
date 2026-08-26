import { expect, test, type Page } from "@playwright/test";

test("runs the documented lifecycle from packed public exports", async ({ page }) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.goto("/");
  await page.waitForTimeout(100);
  expect(pageErrors).toEqual([]);
  await expectRegistrationEvidence(page);
  await expect(page.locator("#app")).toHaveAttribute("data-mounted", "true");
  await expect(page.locator("#app")).toHaveAttribute("data-source-integrity", "unsigned");
  await expect(page.locator("unifold-text-field")).toHaveCount(1);
  await page.getByLabel("Name").fill("Ada Lovelace");
  await expect(page.getByLabel("Name")).toHaveValue("Ada Lovelace");
  await expect(page.getByTestId("latest-event")).toHaveText(
    "org.unifold.ui.transaction.committed.v1"
  );
  await expect.poll(() => themeToken(page)).not.toBe("");
  await page.getByTestId("update-document").click();
  await expect(page.locator("#app")).toHaveAttribute("data-updated", "true");
  await expect(page.getByLabel("Full name")).toHaveValue("Ada Lovelace");
  await expect(page.getByText("Updated from a packed dependency")).toBeVisible();
  await page.getByTestId("dispose-application").click();
  await expect(page.locator("#app")).toHaveAttribute("data-disposed", "true");
});

async function expectRegistrationEvidence(page: Page): Promise<void> {
  expect(await registrationEvidence(page)).toEqual({
    constructorsDistinct: true,
    diagnosticIsCatalogMismatch: true,
    differentReleaseRejected: true,
    firstDefinedBaseline: true,
    firstOwnsButton: true,
    firstRegistered: true,
    iframeWasNotPartiallyRegistered: true,
    litRuntimeShared: true,
    secondDefinedNoTags: true,
    secondRegistered: true
  });
}

async function themeToken(page: Page): Promise<string> {
  return page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue("--unifold-color-text").trim()
  );
}

async function registrationEvidence(page: Page): Promise<unknown> {
  return page.evaluate(() => {
    const serialized = document.documentElement.dataset["registrationEvidence"];
    if (serialized === undefined) throw new Error("Registration evidence is missing.");
    return JSON.parse(serialized) as unknown;
  });
}
