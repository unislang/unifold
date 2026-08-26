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

test("filters and selects through active-descendant keyboard semantics", async ({
  page,
  unifold
}) => {
  await page.goto("/");
  const baseline = await readRenderBaseline(page, [
    compositionNodeIds.combobox,
    compositionNodeIds.country
  ]);
  const input = page.getByRole("combobox", { name: "Assignee" });

  await selectGraceWithKeyboard(page);
  await unifold.assertAccessibility();
  await input.press("Enter");
  await expect(input).toHaveValue("Grace Hopper");
  await expect(input).toHaveAttribute("aria-expanded", "false");
  await expect.poll(async () => inputValue(await unifold.events())).toBe("grace");
  assertGraceEvent(requireInputEvent(await unifold.events()));
  assertSelectiveUpdates(await readRenderUpdates(page, baseline), {
    affectedNodeIds: [compositionNodeIds.combobox],
    unaffectedNodeIds: [compositionNodeIds.country]
  });
});

async function selectGraceWithKeyboard(
  page: Parameters<typeof readRenderBaseline>[0]
): Promise<void> {
  const input = page.getByRole("combobox", { name: "Assignee" });
  await input.focus();
  await input.press("ArrowDown");
  await expect(input).toHaveAttribute("aria-expanded", "true");
  await expect(input).toHaveAttribute(
    "aria-activedescendant",
    `${compositionNodeIds.combobox}-option-0`
  );
  await input.press("ArrowDown");
  await expect(input).toHaveAttribute(
    "aria-activedescendant",
    `${compositionNodeIds.combobox}-option-2`
  );
}

function assertGraceEvent(event: CapturedEvent): void {
  expect(event.data.sourceNode).toMatchObject({
    id: compositionNodeIds.combobox,
    type: "Combobox",
    version: "1.0.0"
  });
  expect(event.data.change).toEqual({ value: "grace" });
  expect(event.data.snapshot?.control?.value).toBe("ada");
}

test("keeps unmatched queries local, restores on Escape, and canonically clears", async ({
  page,
  unifold
}) => {
  await page.goto("/");
  const start = (await unifold.events()).length;
  const host = page.getByTestId("assignee");
  const input = page.getByRole("combobox", { name: "Assignee" });

  await input.fill("not present");
  await expect(host.getByRole("status")).toHaveText("No matching people");
  await expect(host.getByRole("option")).toHaveCount(0);
  expect((await unifold.events()).slice(start)).toEqual([]);
  await unifold.assertAccessibility();

  await input.press("Escape");
  await expect(input).toHaveValue("Ada Lovelace");
  await input.fill("");
  await expect.poll(async () => inputValue(await unifold.events())).toBe("");
  expect(requireInputEvent(await unifold.events()).data.snapshot?.control?.value).toBe("ada");
  await input.blur();
  await expect(input).toHaveAttribute("aria-expanded", "false");
  await unifold.assertAccessibility();
});

function inputValue(events: readonly CapturedEvent[]): unknown {
  const change = latestInputEvent(events)?.data.change;
  if (Object.prototype.toString.call(change) !== "[object Object]") return undefined;
  return (change as Readonly<Record<string, unknown>>)["value"];
}

function requireInputEvent(events: readonly CapturedEvent[]): CapturedEvent {
  const event = latestInputEvent(events);
  if (event === undefined) throw new Error("Combobox input event is missing.");
  return event;
}

function latestInputEvent(events: readonly CapturedEvent[]): CapturedEvent | undefined {
  return [...events].reverse().find((candidate) => {
    return (
      candidate.type === ElementEventType.ControlInput &&
      candidate.data.sourceNode?.id === compositionNodeIds.combobox
    );
  });
}
