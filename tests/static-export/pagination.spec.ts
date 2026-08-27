import { expect, test, type Locator, type Page } from "@playwright/test";

const PAGINATION_ID = "results-pagination";

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("keeps safe destinations usable and href-less items noninteractive", async ({ page }) => {
    await page.goto("/");
    const pagination = staticPagination(page);
    await expect(pagination.getByRole("navigation", { name: "Search result pages" })).toBeVisible();
    await expect(pagination.getByRole("listitem")).toHaveCount(5);
    const current = pagination.getByRole("link", { name: "Current results page, page 1" });
    await expect(current).toHaveAttribute("aria-current", "page");
    await expect(current).toHaveAttribute("aria-disabled", "true");
    await expect(current).not.toHaveAttribute("href");
    const previous = pagination.getByRole("link", { name: "Previous results page" });
    await expect(previous).toHaveAttribute("aria-disabled", "true");
    await expect(previous).not.toHaveAttribute("href");
    const pageTwo = pagination.getByRole("link", { name: "Go to results page 2" });
    await expect(pageTwo).toHaveAttribute("href", "#static-results-page-2");
    await expect(pagination.locator("button")).toHaveCount(0);
    await expect(pagination.getByText("More result pages", { exact: true })).toBeAttached();
  });
});

test("upgrades Pagination and emits stable linked item identity", async ({ page }) => {
  await page.goto("/?upgrade=manual");
  await installUpgrade(page);
  const pagination = upgradedPagination(page);
  await expect(pagination.getByRole("navigation", { name: "Search result pages" })).toBeVisible();
  await clearEvents(page);
  await pagination.getByRole("link", { name: "Go to results page 2" }).click();
  await expect
    .poll(() => latestActivation(page))
    .toEqual({
      href: "#static-results-page-2",
      itemId: "results-page-2",
      kind: "page"
    });
  await expect(
    pagination.getByRole("button", { name: "Current results page, page 1" })
  ).toHaveAttribute("aria-current", "page");
});

test("rejects tampered Pagination destinations without replacing fallback", async ({ page }) => {
  await page.goto("/?upgrade=manual");
  const fallback = staticPagination(page);
  await fallback.getByRole("link", { name: "Go to results page 2" }).evaluate((element) => {
    element.setAttribute("href", "javascript:alert(1)");
  });
  await expectRejectedUpgrade(page);
  await expect(fallback.locator('a[href^="javascript"]')).toHaveCount(1);
  await expect(upgradedPagination(page)).toHaveCount(0);
});

test("rejects Pagination order drift without replacing fallback", async ({ page }) => {
  await page.goto("/?upgrade=manual");
  const fallback = staticPagination(page);
  await fallback
    .locator("li")
    .first()
    .evaluate((element) => {
      element.setAttribute("data-pagination-item-id", "next");
    });
  await expectRejectedUpgrade(page);
  await expect(fallback.locator('li[data-pagination-item-id="next"]')).toHaveCount(2);
  await expect(upgradedPagination(page)).toHaveCount(0);
});

function staticPagination(page: Page): Locator {
  return page.locator(`[data-unifold-static-node-id="${PAGINATION_ID}"]`);
}

function upgradedPagination(page: Page): Locator {
  return page.locator(`unifold-pagination[data-unifold-node-id="${PAGINATION_ID}"]`);
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

async function latestActivation(page: Page): Promise<unknown> {
  return page.evaluate((paginationId) => {
    const event = [...window.__unifoldStaticEvents]
      .reverse()
      .find(({ data, type }) =>
        [
          type === "org.unifold.ui.component.activated.v1",
          Reflect.get(Object(Reflect.get(Object(data), "sourceNode")), "id") === paginationId
        ].every(Boolean)
      );
    return event?.data.change;
  }, PAGINATION_ID);
}
