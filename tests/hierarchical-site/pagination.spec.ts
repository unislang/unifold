import {
  expect,
  readRenderBaseline,
  readRenderUpdates,
  test,
  type UnifoldHarness
} from "@unislang/unifold-playwright";
import { assertSelectiveUpdates } from "@unislang/unifold-testkit";
import type { Locator, Page } from "@playwright/test";

const ACTIVATED = "org.unifold.ui.component.activated.v1";
const PAGINATION_ID = "results-pagination";
const UNCHANGED_ID = "security-warning-toast";

type CapturedEvent = Awaited<ReturnType<UnifoldHarness["events"]>>[number];

test("navigates explicit Pagination items through one canonical event stream", async ({
  page,
  unifold
}) => {
  await page.goto("/");
  const pagination = host(page);
  await verifyInitialSemantics(pagination);
  await verifyNoninteractiveItems(page, pagination, unifold);
  await rememberUnchangedIdentity(page);
  await clearEvents(page);
  const baseline = await readRenderBaseline(page, [PAGINATION_ID, UNCHANGED_ID, "profile-search"]);
  const pageTwo = pagination.getByRole("link", { name: "Go to results page 2" });
  await pageTwo.focus();
  await pageTwo.press("Enter");
  await verifyPageTwoProjection(page, pagination, baseline);
  await verifyActivation(unifold);
  await unifold.assertAccessibility();
});

async function verifyInitialSemantics(pagination: Locator): Promise<void> {
  await expect(pagination.getByRole("navigation", { name: "Search result pages" })).toBeVisible();
  await expect(pagination.getByRole("listitem")).toHaveCount(5);
  await expect(
    pagination.getByRole("link", { name: "Current results page, page 1" })
  ).toHaveAttribute("aria-current", "page");
  await expect(pagination.getByRole("button", { name: "Previous results page" })).toBeDisabled();
  await expect(pagination.getByText("More result pages", { exact: true })).toBeAttached();
}

async function verifyNoninteractiveItems(
  page: Page,
  pagination: Locator,
  unifold: UnifoldHarness
): Promise<void> {
  await clearEvents(page);
  await pagination.getByRole("button", { name: "Previous results page" }).evaluate((element) => {
    element.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
  await pagination.getByText("More result pages", { exact: true }).click({ force: true });
  expect(paginationEvents(await unifold.events())).toHaveLength(0);
}

async function verifyPageTwoProjection(
  page: Page,
  pagination: Locator,
  baseline: Awaited<ReturnType<typeof readRenderBaseline>>
): Promise<void> {
  await expect(
    pagination.getByRole("link", { name: "Current results page, page 2" })
  ).toHaveAttribute("aria-current", "page");
  await expect(
    pagination.getByRole("link", { name: "Current results page, page 2" })
  ).toBeFocused();
  await expect(pagination.getByRole("button", { name: "Next results page" })).toBeDisabled();
  expect(await unchangedIdentityIsStable(page)).toBe(true);
  assertSelectiveUpdates(await readRenderUpdates(page, baseline), {
    affectedNodeIds: [PAGINATION_ID],
    unaffectedNodeIds: [UNCHANGED_ID, "profile-search"]
  });
}

async function verifyActivation(unifold: UnifoldHarness): Promise<void> {
  await expect.poll(async () => paginationEvents(await unifold.events()).length).toBe(1);
  expect(paginationEvents(await unifold.events())[0]).toMatchObject({
    data: {
      change: { href: "#results-page-2", itemId: "results-page-2", kind: "page" }
    },
    type: ACTIVATED
  });
}

function paginationEvents(events: readonly CapturedEvent[]): readonly CapturedEvent[] {
  return events.filter(
    (event) => event.type === ACTIVATED && property(event.data.sourceNode, "id") === PAGINATION_ID
  );
}

function host(page: Page): Locator {
  return page.locator(`unifold-pagination[data-unifold-node-id="${PAGINATION_ID}"]`);
}

async function rememberUnchangedIdentity(page: Page): Promise<void> {
  await page.locator(`[data-unifold-node-id="${UNCHANGED_ID}"]`).evaluate((element) => {
    Reflect.set(window, "__unifoldPaginationUnchanged", element);
  });
}

async function unchangedIdentityIsStable(page: Page): Promise<boolean> {
  return page.locator(`[data-unifold-node-id="${UNCHANGED_ID}"]`).evaluate((element) => {
    return Reflect.get(window, "__unifoldPaginationUnchanged") === element;
  });
}

async function clearEvents(page: Page): Promise<void> {
  await page.evaluate(() => {
    const target = window as unknown as { __unifoldCapturedEvents: unknown[] };
    target.__unifoldCapturedEvents.splice(0);
  });
}

function property(value: unknown, name: string): unknown {
  return Reflect.get(Object(value), name) as unknown;
}
