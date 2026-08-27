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
const COMMAND_APPLIED = "org.unifold.ui.command.applied.v1";
const TOAST_ID = "profile-ready-toast";
const WARNING_ID = "security-warning-toast";

type CapturedEvent = Awaited<ReturnType<UnifoldHarness["events"]>>[number];

test("announces and dismisses one bounded toast through the unified stream", async ({
  page,
  unifold
}) => {
  await page.goto("/");
  await verifyInitialSemantics(page);
  await rememberWarningIdentity(page);
  await clearEvents(page);
  const baseline = await readRenderBaseline(page, [TOAST_ID, WARNING_ID, "profile-search"]);
  await page.getByRole("button", { name: "Dismiss profile notification" }).click();
  await verifyDismissalProjection(page, baseline);
  await verifyDismissalEvents(unifold);
  await expect(page.getByRole("button", { name: "Submit contact details" })).toBeFocused();
  await unifold.assertAccessibility();
});

async function verifyInitialSemantics(page: Page): Promise<void> {
  const ready = toastHost(page, TOAST_ID);
  const warning = toastHost(page, WARNING_ID);
  await expect(ready.getByRole("status")).toContainText("Profile ready");
  await expect(ready.getByRole("status")).toHaveAttribute("aria-atomic", "true");
  await expect(warning.getByRole("alert")).toContainText("Security warning");
  await expect(warning.getByRole("button")).toHaveCount(0);
  await expect(ready.getByRole("button", { name: "Dismiss profile notification" })).toBeVisible();
  expect(await activeElementTag(page)).toBe("BODY");
}

async function verifyDismissalProjection(
  page: Page,
  baseline: Awaited<ReturnType<typeof readRenderBaseline>>
): Promise<void> {
  const ready = toastHost(page, TOAST_ID);
  await expect(ready).toBeHidden();
  await expect(ready.getByRole("status")).toHaveCount(0);
  await expect(ready.getByRole("button")).toHaveCount(0);
  expect(await warningIdentityIsStable(page)).toBe(true);
  assertSelectiveUpdates(await readRenderUpdates(page, baseline), {
    affectedNodeIds: [TOAST_ID],
    unaffectedNodeIds: [WARNING_ID, "profile-search"]
  });
}

async function verifyDismissalEvents(unifold: UnifoldHarness): Promise<void> {
  await expect.poll(async () => toastEvents(await unifold.events()).length).toBe(1);
  const event = toastEvents(await unifold.events())[0];
  expect(event).toMatchObject({
    data: { change: { dismissed: true, reason: "manual" } },
    type: ACTIVATED
  });
  await expect.poll(async () => commandEvents(await unifold.events()).length).toBe(2);
}

function commandEvents(events: readonly CapturedEvent[]): readonly CapturedEvent[] {
  return events.filter(({ type }) => type === COMMAND_APPLIED);
}

function toastEvents(events: readonly CapturedEvent[]): readonly CapturedEvent[] {
  return events.filter(
    (event) => event.type === ACTIVATED && property(event.data.sourceNode, "id") === TOAST_ID
  );
}

function toastHost(page: Page, id: string): Locator {
  return page.locator(`unifold-toast[data-unifold-node-id="${id}"]`);
}

async function rememberWarningIdentity(page: Page): Promise<void> {
  await toastHost(page, WARNING_ID).evaluate((element) => {
    Reflect.set(window, "__unifoldWarningToast", element);
  });
}

async function warningIdentityIsStable(page: Page): Promise<boolean> {
  return toastHost(page, WARNING_ID).evaluate((element) => {
    return Reflect.get(window, "__unifoldWarningToast") === element;
  });
}

async function activeElementTag(page: Page): Promise<string> {
  return page.evaluate(() => document.activeElement?.tagName ?? "");
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
