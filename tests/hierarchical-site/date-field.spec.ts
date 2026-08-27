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
const INVALID = "org.unifold.ui.form.invalid.v1";
const SUBMITTED = "org.unifold.ui.form.submitted.v1";
const DATE_ID = "contact-start-date";
const LOCKED_DATE_ID = "locked-start-date";
const DATE_EVENT_TYPES = new Set([INPUT, BLURRED]);

type CapturedEvent = Awaited<ReturnType<UnifoldHarness["events"]>>[number];

test("routes a date-only field through events, form state, and selective projection", async ({
  page,
  unifold
}) => {
  await page.goto("/");
  const control = page.getByLabel("Start date", { exact: true });
  await verifyInitialSemantics(control);
  await verifyDisabledRejection(page, unifold);
  await clearEvents(page);
  const baseline = await readRenderBaseline(page, [DATE_ID, "profile-search"]);
  await control.fill("2026-09-03");
  await page.getByLabel("Your name").focus();
  await verifyInteractionEvents(unifold);
  assertSelectiveUpdates(await readRenderUpdates(page, baseline), {
    affectedNodeIds: [DATE_ID],
    unaffectedNodeIds: ["profile-search"]
  });
  expect(await submittedDate(control)).toBe("2026-09-03");
  await verifyRequiredInvalid(page, control, unifold);
  await submitValidDate(page, control, unifold);
  await unifold.assertAccessibility();
});

async function verifyInitialSemantics(control: Locator): Promise<void> {
  await expect(control).toHaveAttribute("type", "date");
  await expect(control).toHaveAttribute("autocomplete", "off");
  await expect(control).toHaveAttribute("min", "2025-01-01");
  await expect(control).toHaveAttribute("max", "2027-12-31");
  await expect(control).toHaveAttribute("step", "1");
  await expect(control).toHaveValue("2026-08-26");
  expect(await submittedDate(control)).toBe("2026-08-26");
}

async function verifyDisabledRejection(page: Page, unifold: UnifoldHarness): Promise<void> {
  const control = page.getByLabel("Locked start date", { exact: true });
  await expect(control).toBeDisabled();
  const before = sourceEvents(await unifold.events(), LOCKED_DATE_ID).length;
  await control.evaluate((input: HTMLInputElement) => {
    input.value = "2026-09-03";
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await expect(control).toHaveValue("");
  expect(sourceEvents(await unifold.events(), LOCKED_DATE_ID)).toHaveLength(before);
}

async function verifyInteractionEvents(unifold: UnifoldHarness): Promise<void> {
  await expect.poll(async () => dateEvents(await unifold.events()).length).toBe(2);
  expect(eventSummary(dateEvents(await unifold.events()))).toEqual([
    { change: { origin: "input", value: "2026-09-03" }, type: INPUT },
    { change: { value: "2026-09-03" }, type: BLURRED }
  ]);
}

function dateEvents(events: readonly CapturedEvent[]): readonly CapturedEvent[] {
  return sourceEvents(events, DATE_ID).filter((event) => DATE_EVENT_TYPES.has(event.type));
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

async function submittedDate(control: Locator): Promise<string | null> {
  return control.evaluate((element) => {
    const root = element.getRootNode();
    const form = Reflect.get(
      root instanceof ShadowRoot ? root.host : element,
      "form"
    ) as HTMLFormElement | null;
    if (form === null) throw new Error("DateField form owner is missing.");
    return new FormData(form).get("startDate") as string | null;
  });
}

async function verifyRequiredInvalid(
  page: Page,
  control: Locator,
  unifold: UnifoldHarness
): Promise<void> {
  await control.fill("");
  await page.getByLabel("Your name").fill("Ada Lovelace");
  await page.getByRole("button", { name: "Submit contact details" }).click();
  await expect.poll(async () => latestFormResult(await unifold.events())?.type).toBe(INVALID);
  await expect(control).toHaveAttribute("aria-invalid", "true");
  expect(await submittedDate(control)).toBe("");
}

async function submitValidDate(
  page: Page,
  control: Locator,
  unifold: UnifoldHarness
): Promise<void> {
  await control.fill("2026-10-15");
  await expect(control).toHaveAttribute("aria-invalid", "false");
  await page.getByRole("button", { name: "Submit contact details" }).click();
  await expect
    .poll(async () => latestFormResult(await unifold.events()))
    .toMatchObject({
      data: { change: { values: { startDate: "2026-10-15" } } },
      type: SUBMITTED
    });
}

function latestFormResult(events: readonly CapturedEvent[]): CapturedEvent | undefined {
  return [...events].reverse().find(({ type }) => type === SUBMITTED || type === INVALID);
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
