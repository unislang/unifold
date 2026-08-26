import { UiEventType, type UiEvent } from "@unislang/unifold-events";
import { expect, test } from "@unislang/unifold-playwright";

test("cancels superseded validation and projects only the latest result", async ({
  page,
  unifold
}) => {
  await page.goto("/");
  const name = page.getByLabel("Your name");

  await name.fill("taken");
  await expect
    .poll(async () => countEvents(await unifold.events(), UiEventType.ValidationStarted))
    .toBe(1);
  await name.fill("available");
  await expect
    .poll(async () => countEvents(await unifold.events(), UiEventType.ValidationCompleted))
    .toBe(1);

  await expect(name).toHaveAttribute("aria-invalid", "false");
  await expect(page.getByText("This name is unavailable.")).toHaveCount(0);
  const events = await unifold.events();
  const eventTypes = events.map(({ type }) => type);
  expect(countEvents(events, UiEventType.ValidationStarted)).toBe(2);
  expect(eventTypes).toEqual(expect.arrayContaining([UiEventType.ValidationCancelled]));
  expect(countEvents(events, UiEventType.ValidationFailed)).toBe(0);
});

test("projects an authoritative async validation error accessibly", async ({ page, unifold }) => {
  await page.goto("/");
  const name = page.getByLabel("Your name");

  await name.fill("taken");
  await expect
    .poll(async () => countEvents(await unifold.events(), UiEventType.ValidationCompleted))
    .toBe(1);
  const completed = requireCompleted(await unifold.events());
  expect(completed.data.change).toMatchObject({ errorCount: 1 });
  expect(completed.data.snapshot?.control).toMatchObject({
    errors: [{ code: "name-unavailable", validatorId: "name-available" }]
  });
  await name.press("Tab");
  await expect
    .poll(async () => countEvents(await unifold.events(), UiEventType.ValidationCompleted))
    .toBe(2);
  await expect(name).toHaveAttribute("aria-invalid", "true");
  const form = page.getByRole("form", { name: "Profile" });
  await expect(form.getByText("This name is unavailable.")).toHaveCount(1);
  expect(countEvents(await unifold.events(), UiEventType.ValidationCompleted)).toBe(2);
});

function countEvents(events: readonly { readonly type: string }[], type: UiEventType): number {
  return events.filter((event) => event.type === type).length;
}

function requireCompleted(events: readonly UiEvent[]): UiEvent {
  const event = events.find(({ type }) => type === UiEventType.ValidationCompleted);
  if (event === undefined) throw new Error("Async validation completion is missing.");
  return event;
}
