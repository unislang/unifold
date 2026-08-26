import type { Page } from "@playwright/test";

export function installSettledNavigation(page: Page): void {
  const navigate = page.goto.bind(page);
  page.goto = (url, options) => navigate(url, { ...options, waitUntil: "networkidle" });
}
