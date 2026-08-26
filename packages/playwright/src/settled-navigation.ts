import type { Page } from "@playwright/test";

export function installSettledNavigation(page: Page): void {
  const navigate = page.goto.bind(page);
  page.goto = async (url, options) => {
    const response = await navigate(url, { ...options, waitUntil: "networkidle" });
    const readiness = await page.locator("html").getAttribute("data-unifold-readiness");
    if (readiness === null) return response;
    await page.waitForFunction(referenceReadinessSettled);
    const settled = await page.locator("html").getAttribute("data-unifold-readiness");
    if (settled !== "ready") throw new Error("The Unifold page reported failed readiness.");
    return response;
  };
}

function referenceReadinessSettled(): boolean {
  return document.documentElement.dataset["unifoldReadiness"] !== "pending";
}
