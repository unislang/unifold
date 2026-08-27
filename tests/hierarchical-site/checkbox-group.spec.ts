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
const TOPICS_ID = "contact-topics";
const GROUP_EVENT_TYPES = new Set([INPUT, BLURRED]);

type CapturedEvent = Awaited<ReturnType<UnifoldHarness["events"]>>[number];

test("routes one native CheckboxGroup through events, form state, and selective projection", async ({
  page,
  unifold
}) => {
  await page.goto("/");
  const controls = topicControls(page);
  await verifyInitialSemantics(controls);
  await verifyDisabledOption(controls.internal, unifold);
  await clearEvents(page);
  const baseline = await readRenderBaseline(page, [TOPICS_ID, "profile-search"]);
  await exerciseInteractions(page, unifold, controls);
  await verifyInteractionEvents(unifold);
  assertSelectiveUpdates(await readRenderUpdates(page, baseline), {
    affectedNodeIds: [TOPICS_ID],
    unaffectedNodeIds: ["profile-search"]
  });
  expect(await repeatedTopics(controls.group)).toEqual(["security"]);
  await submitTopics(page, unifold);
  await unifold.assertAccessibility();
});

interface TopicControls {
  readonly group: Locator;
  readonly internal: Locator;
  readonly news: Locator;
  readonly security: Locator;
}

function topicControls(page: Page): TopicControls {
  const group = page.locator(`[data-unifold-node-id="${TOPICS_ID}"]`);
  return {
    group,
    internal: group.getByRole("checkbox", { name: "Internal updates" }),
    news: group.getByRole("checkbox", { name: "Product news" }),
    security: group.getByRole("checkbox", { name: "Security alerts" })
  };
}

async function verifyInitialSemantics(controls: TopicControls): Promise<void> {
  await expect(controls.group.getByRole("group", { name: "Topics" })).toBeVisible();
  await expect(controls.news).toBeChecked();
  await expect(controls.internal).toBeDisabled();
}

async function verifyDisabledOption(internal: Locator, unifold: UnifoldHarness): Promise<void> {
  const before = checkboxGroupEvents(await unifold.events()).length;
  await internal.evaluate((input: HTMLInputElement) => {
    input.checked = true;
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await expect(internal).not.toBeChecked();
  expect(checkboxGroupEvents(await unifold.events())).toHaveLength(before);
}

async function exerciseInteractions(
  page: Page,
  unifold: UnifoldHarness,
  controls: TopicControls
): Promise<void> {
  await controls.news.focus();
  await controls.security.focus();
  expect(checkboxGroupEvents(await unifold.events())).toEqual([]);
  await controls.security.press("Space");
  await expect(controls.security).toBeChecked();
  await controls.news.focus();
  await controls.news.press("Space");
  await expect(controls.news).not.toBeChecked();
  await page.getByLabel("Your name").focus();
}

async function verifyInteractionEvents(unifold: UnifoldHarness): Promise<void> {
  await expect
    .poll(async () => checkboxGroupEvents(await unifold.events()).length)
    .toBeGreaterThanOrEqual(3);
  const summary = interactionSummary(checkboxGroupEvents(await unifold.events()));
  expect(summary, JSON.stringify(summary)).toEqual([
    { change: { origin: "input", value: ["news", "security"] }, type: INPUT },
    { change: { origin: "input", value: ["security"] }, type: INPUT },
    { change: { value: ["security"] }, type: BLURRED }
  ]);
}

function checkboxGroupEvents(events: readonly CapturedEvent[]): readonly CapturedEvent[] {
  return events.filter(
    (event) =>
      property(event.data.sourceNode, "id") === TOPICS_ID && GROUP_EVENT_TYPES.has(event.type)
  );
}

function interactionSummary(events: readonly CapturedEvent[]) {
  return events.map((event) => ({ change: event.data.change, type: event.type }));
}

async function repeatedTopics(group: Locator): Promise<readonly string[]> {
  return group.evaluate((element) => {
    const form = Reflect.get(element, "form") as HTMLFormElement | null;
    if (form === null) throw new Error("CheckboxGroup form owner is missing.");
    return new FormData(form).getAll("topics").map(String);
  });
}

async function submitTopics(page: Page, unifold: UnifoldHarness): Promise<void> {
  await page.getByLabel("Your name").fill("Ada Lovelace");
  await page.getByRole("button", { name: "Submit contact details" }).click();
  await expect
    .poll(async () => latestFormResult(await unifold.events()))
    .toMatchObject({
      data: { change: { values: { topics: ["security"] } } },
      type: SUBMITTED
    });
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
