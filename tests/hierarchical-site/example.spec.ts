import {
  expect,
  readRenderBaseline,
  readRenderUpdates,
  test,
  type UnifoldHarness
} from "@unislang/unifold-playwright";
import { assertSelectiveUpdates } from "@unislang/unifold-testkit";

test("executes rules, semantics, event routing, and selective projection", async ({
  page,
  unifold
}) => {
  await page.goto("/");
  await verifyGuardDenial(page);
  const summary = await enableSummary(page);
  await summary.click();
  await verifySummary(page, unifold);
});

async function verifyGuardDenial(page: Parameters<typeof readRenderBaseline>[0]): Promise<void> {
  await page.locator("[data-unifold-node-id='show-summary']").evaluate((host) => {
    const emit = Reflect.get(host, "emitUiEvent") as (
      type: string,
      change: Readonly<Record<string, string>>
    ) => void;
    emit.call(host, "org.unifold.ui.component.activated.v1", { action: "button" });
  });
  await expect(page.getByTestId("machine-state")).toHaveText("editing");
  await expect(page.getByText("Summary not created", { exact: true })).toBeVisible();
}

async function enableSummary(page: Parameters<typeof readRenderBaseline>[0]) {
  const summary = page.getByRole("button", { name: "Create summary" });
  await expect(summary).toBeDisabled();
  await page.getByLabel("Your name").fill("Ada Lovelace");
  const baseline = await readRenderBaseline(page, [
    "contact-consent",
    "show-summary",
    "contact-name"
  ]);
  await page.getByLabel("I agree to create the summary").check();
  await expect(summary).toBeEnabled();
  assertSelectiveUpdates(await readRenderUpdates(page, baseline), {
    affectedNodeIds: ["contact-consent", "show-summary"],
    unaffectedNodeIds: ["contact-name"]
  });
  return summary;
}

async function verifySummary(
  page: Parameters<typeof readRenderBaseline>[0],
  unifold: UnifoldHarness
): Promise<void> {
  await expect(page.getByText("Summary created", { exact: true })).toBeVisible();
  await expect(page.getByTestId("machine-state")).toHaveText("summarized");
  await expect.poll(() => semanticName(page)).toBe("Ada Lovelace");
  expect((await unifold.events()).map(({ type }) => type)).toEqual(
    expect.arrayContaining([
      "org.unifold.ui.component.activated.v1",
      "org.unifold.ui.command.applied.v1",
      "org.unifold.ui.transaction.committed.v1"
    ])
  );
}

test("has no serious or critical detectable accessibility violations", async ({
  page,
  unifold
}) => {
  await page.goto("/");
  await unifold.assertAccessibility();
});

test("renders nested Dialog JSON through the layoutType authoring pipeline", async ({
  page,
  unifold
}) => {
  await page.goto("/");
  const host = page.getByTestId("account-review-dialog");
  const trigger = host.getByRole("button", { name: "Review generated summary" });
  const dialog = host.getByRole("dialog", { name: "Review generated account summary" });
  await trigger.click();
  await expect(dialog).toBeVisible();
  await expect(page.getByRole("button", { name: "Cancel summary review" })).toBeFocused();
  await expect(
    host.getByText("This modal is authored through layoutType variables and nested JSON.")
  ).toBeVisible();
  await expect(
    host.getByRole("link", { name: "Inspect generated summary details" })
  ).toHaveAttribute("href", "#hierarchical-dialog-details");
  await unifold.assertAccessibility();
  await dialog.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
});

test("renders bounded Image and Card content with native semantics", async ({ page, unifold }) => {
  await page.goto("/");
  const card = page.getByTestId("profile-card");
  await expect(card.locator("article")).toHaveAttribute("aria-label", "Profile media summary");
  await expect(card).toContainText("This card is authored entirely through nested layout JSON.");
  const image = page.getByTestId("profile-image").locator("img");
  await expect(image).toHaveAttribute("alt", "Blue and green geometric profile placeholder");
  await expect(image).toHaveAttribute("src", "/profile-placeholder.svg");
  await expect(image).toHaveAttribute("width", "320");
  await expect(image).toHaveAttribute("height", "180");
  await expect(image).toHaveAttribute("loading", "lazy");
  await unifold.assertAccessibility();
});

test("routes bounded NumberField input through numeric canonical state", async ({
  page,
  unifold
}) => {
  await page.goto("/");
  const host = page.getByTestId("contact-age");
  const input = page.getByLabel("Age");
  await expect(input).toHaveAttribute("type", "number");
  await expect(input).toHaveAttribute("min", "0");
  await expect(input).toHaveAttribute("max", "130");
  await expect(input).toHaveAttribute("step", "1");
  await input.fill("42");
  await expect.poll(async () => numberFieldEventValue(await unifold.events())).toBe(42);
  await expect.poll(() => host.evaluate((element) => Reflect.get(element, "value"))).toBe(42);
  await unifold.assertAccessibility();
});

test("routes SearchField input through scalar canonical state", async ({ page, unifold }) => {
  await page.goto("/");
  const host = page.getByTestId("profile-search");
  const input = page.getByLabel("Search profiles");
  await expect(input).toHaveAttribute("type", "search");
  await expect(input).toHaveAttribute("autocomplete", "off");
  await expect(input).toHaveAttribute("enterkeyhint", "search");
  await expect(input).toHaveAttribute("maxlength", "2048");
  await input.fill("Ada");
  await expect.poll(async () => searchFieldEventValue(await unifold.events())).toBe("Ada");
  await expect.poll(() => host.evaluate((element) => Reflect.get(element, "value"))).toBe("Ada");
  await page.getByLabel("Your name").fill("Ada Lovelace");
  const submissions = eventTypeCount(await unifold.events(), "org.unifold.ui.form.submitted.v1");
  await input.press("Enter");
  await expect
    .poll(async () => eventTypeCount(await unifold.events(), "org.unifold.ui.form.submitted.v1"))
    .toBe(submissions + 1);
  await unifold.assertAccessibility();
});

function numberFieldEventValue(events: Awaited<ReturnType<UnifoldHarness["events"]>>): unknown {
  const change = [...events]
    .reverse()
    .find(
      (event) =>
        event.type === "org.unifold.ui.control.input.v1" &&
        event.data.sourceNode?.id === "contact-age"
    )?.data.change;
  return isRecord(change) ? change["value"] : undefined;
}

function searchFieldEventValue(events: Awaited<ReturnType<UnifoldHarness["events"]>>): unknown {
  const change = [...events]
    .reverse()
    .find(
      (event) =>
        event.type === "org.unifold.ui.control.input.v1" &&
        event.data.sourceNode?.id === "profile-search"
    )?.data.change;
  return isRecord(change) ? change["value"] : undefined;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function eventTypeCount(
  events: Awaited<ReturnType<UnifoldHarness["events"]>>,
  type: string
): number {
  return events.filter((event) => event.type === type).length;
}

async function semanticName(page: Parameters<typeof readRenderBaseline>[0]) {
  return page.locator("script[data-unifold-semantics]").evaluate((element) => {
    const graph = JSON.parse(element.textContent ?? "{}") as { "@graph": [{ name: string }] };
    return graph["@graph"][0].name;
  });
}
