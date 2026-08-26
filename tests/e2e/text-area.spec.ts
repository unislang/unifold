import {
  expect,
  readRenderBaseline,
  readRenderUpdates,
  test,
  type UnifoldHarness
} from "@unislang/unifold-playwright";
import { ElementEventType } from "@unislang/unifold-elements";
import { assertSelectiveUpdates } from "@unislang/unifold-testkit";

import { compositionNodeIds } from "./reference.scenarios.js";

type CapturedEvent = Awaited<ReturnType<UnifoldHarness["events"]>>[number];

test("supports the complete native-control keyboard journey", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Your name").focus();
  await page.keyboard.type("Ada Lovelace");
  await pressTabTo(page, "Confirm name");
  await pressTabTo(page, "Biography");
  await pressTabTo(page, "Receive product updates");
  await pressTabTo(page, "Email");
  await pressTabTo(page, "Country");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("combobox", { name: "Assignee" })).toBeFocused();
  await pressTabTo(page, "Skills");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Create greeting" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("submitted-value")).toHaveText("Ada Lovelace");
});

test("commits multiline text through the unified stream and selectively projects", async ({
  page,
  unifold
}) => {
  await page.goto("/");
  const baseline = await readRenderBaseline(page, [
    compositionNodeIds.biography,
    compositionNodeIds.country
  ]);
  const value = "First line\nSecond line";
  await page.getByLabel("Biography").fill(value);
  await expect(page.getByLabel("Biography")).toHaveValue(value);
  await expect.poll(async () => textAreaValue(await unifold.events())).toBe(value);
  assertSelectiveUpdates(await readRenderUpdates(page, baseline), {
    affectedNodeIds: [compositionNodeIds.biography],
    unaffectedNodeIds: [compositionNodeIds.country]
  });
});

async function pressTabTo(
  page: Parameters<typeof readRenderBaseline>[0],
  label: string
): Promise<void> {
  await page.keyboard.press("Tab");
  await expect(page.getByLabel(label)).toBeFocused();
}

function textAreaValue(events: readonly CapturedEvent[]): unknown {
  return readChangeValue([...events].reverse().find(isTextAreaInput)?.data.change);
}

function isTextAreaInput(event: CapturedEvent): boolean {
  if (event.type !== ElementEventType.ControlInput) return false;
  return event.data.sourceNode?.id === compositionNodeIds.biography;
}

function readChangeValue(change: CapturedEvent["data"]["change"]): unknown {
  if (Object.prototype.toString.call(change) !== "[object Object]") return undefined;
  return (change as Readonly<Record<string, unknown>>)["value"];
}
