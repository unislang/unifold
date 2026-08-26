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

test("commits a radio choice through the unified stream and updates only its group", async ({
  page,
  unifold
}) => {
  await page.goto("/");
  const baseline = await readRenderBaseline(page, [
    compositionNodeIds.radioGroup,
    compositionNodeIds.country
  ]);
  await page.getByLabel("Phone").check();
  await expect(page.getByLabel("Phone")).toBeChecked();
  await expect.poll(async () => radioValue(await unifold.events())).toBe("phone");
  assertSelectiveUpdates(await readRenderUpdates(page, baseline), {
    affectedNodeIds: [compositionNodeIds.radioGroup],
    unaffectedNodeIds: [compositionNodeIds.country]
  });
});

function radioValue(events: readonly CapturedEvent[]): unknown {
  return readChangeValue([...events].reverse().find(isRadioInput)?.data.change);
}

function isRadioInput(event: CapturedEvent): boolean {
  if (event.type !== ElementEventType.ControlInput) return false;
  return event.data.sourceNode?.id === compositionNodeIds.radioGroup;
}

function readChangeValue(change: CapturedEvent["data"]["change"]): unknown {
  if (Object.prototype.toString.call(change) !== "[object Object]") return undefined;
  return (change as Readonly<Record<string, unknown>>)["value"];
}
