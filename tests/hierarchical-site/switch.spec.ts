import {
  expect,
  readRenderBaseline,
  readRenderUpdates,
  test,
  type UnifoldHarness
} from "@unislang/unifold-playwright";
import { assertSelectiveUpdates } from "@unislang/unifold-testkit";
import type { Locator, Page } from "@playwright/test";

const BLURRED = "org.unifold.ui.control.blurred.v1";
const INPUT = "org.unifold.ui.control.input.v1";
const SUBMITTED = "org.unifold.ui.form.submitted.v1";
const SWITCH_ID = "contact-notifications";
const LOCKED_SWITCH_ID = "locked-notifications";
const SWITCH_EVENT_TYPES = new Set([INPUT, BLURRED]);

type CapturedEvent = Awaited<ReturnType<UnifoldHarness["events"]>>[number];

test("routes one native Switch through events, form state, and selective projection", async ({
  page,
  unifold
}) => {
  await page.goto("/");
  const control = page.getByRole("switch", { name: "Enable notifications" });
  await verifyInitialSemantics(control);
  await verifyDisabledRejection(page, unifold);
  await clearEvents(page);
  const baseline = await readRenderBaseline(page, [SWITCH_ID, "profile-search"]);
  await control.press("Space");
  await expect(control).not.toBeChecked();
  await page.getByLabel("Your name").focus();
  await verifyInteractionEvents(unifold);
  assertSelectiveUpdates(await readRenderUpdates(page, baseline), {
    affectedNodeIds: [SWITCH_ID],
    unaffectedNodeIds: ["profile-search"]
  });
  expect(await submittedNotification(control)).toBeNull();
  await verifyRequiredInvalid(page, control, unifold);
  await submitEnabledSwitch(page, control, unifold);
  await unifold.assertAccessibility();
});

async function verifyInitialSemantics(control: Locator): Promise<void> {
  await expect(control).toHaveAttribute("type", "checkbox");
  await expect(control).toBeChecked();
  expect(await submittedNotification(control)).toBe("on");
}

async function verifyDisabledRejection(page: Page, unifold: UnifoldHarness): Promise<void> {
  const control = page.getByRole("switch", { name: "Locked notifications" });
  await expect(control).toBeDisabled();
  const before = sourceEvents(await unifold.events(), LOCKED_SWITCH_ID).length;
  await control.evaluate((input: HTMLInputElement) => {
    input.checked = true;
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await expect(control).not.toBeChecked();
  expect(sourceEvents(await unifold.events(), LOCKED_SWITCH_ID)).toHaveLength(before);
}

async function verifyInteractionEvents(unifold: UnifoldHarness): Promise<void> {
  await expect.poll(async () => switchEvents(await unifold.events()).length).toBe(2);
  expect(eventSummary(switchEvents(await unifold.events()))).toEqual([
    { change: { origin: "input", value: false }, type: INPUT },
    { change: { value: false }, type: BLURRED }
  ]);
}

function switchEvents(events: readonly CapturedEvent[]): readonly CapturedEvent[] {
  return sourceEvents(events, SWITCH_ID).filter((event) => SWITCH_EVENT_TYPES.has(event.type));
}

function sourceEvents(
  events: readonly CapturedEvent[],
  sourceNodeId: string
): readonly CapturedEvent[] {
  return events.filter((event) => property(event.data.sourceNode, "id") === sourceNodeId);
}

function eventSummary(events: readonly CapturedEvent[]) {
  return events.map((event) => ({ change: event.data.change, type: event.type }));
}

async function submittedNotification(control: Locator): Promise<string | null> {
  return control.evaluate((element) => {
    const root = element.getRootNode();
    const form = Reflect.get(
      root instanceof ShadowRoot ? root.host : element,
      "form"
    ) as HTMLFormElement | null;
    if (form === null) throw new Error("Switch form owner is missing.");
    return new FormData(form).get("notifications") as string | null;
  });
}

async function submitEnabledSwitch(
  page: Page,
  control: Locator,
  unifold: UnifoldHarness
): Promise<void> {
  await control.check();
  await expect(control).toHaveAttribute("aria-invalid", "false");
  await page.getByRole("button", { name: "Submit contact details" }).click();
  await expect
    .poll(async () => latestFormResult(await unifold.events()))
    .toMatchObject({
      data: { change: { values: { notifications: true } } },
      type: SUBMITTED
    });
}

async function verifyRequiredInvalid(
  page: Page,
  control: Locator,
  unifold: UnifoldHarness
): Promise<void> {
  await page.getByLabel("Your name").fill("Ada Lovelace");
  await page.getByRole("button", { name: "Submit contact details" }).click();
  await expect
    .poll(async () => latestFormResult(await unifold.events())?.type)
    .toBe("org.unifold.ui.form.invalid.v1");
  await expect(control).toHaveAttribute("aria-invalid", "true");
}

function latestFormResult(events: readonly CapturedEvent[]): CapturedEvent | undefined {
  return [...events]
    .reverse()
    .find(({ type }) => type === SUBMITTED || type === "org.unifold.ui.form.invalid.v1");
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
