import { expect, test } from "@unislang/unifold-playwright";
import { UnifoldApplicationMountStatus, UnifoldApplicationUpdateStatus } from "@unislang/unifold";

interface CollectionObservation {
  readonly aggregateValue: unknown;
  readonly alphaRetained: boolean;
  readonly alphaValue: unknown;
  readonly authoredKeys: readonly string[];
  readonly focusedId?: string;
  readonly focusRequestIds: readonly string[];
  readonly lateRemovedEvents: number;
  readonly operationEventsCausal: boolean;
  readonly operationEventsOriginated: boolean;
  readonly operationTypes: readonly string[];
  readonly renderedIds: readonly string[];
  readonly revision: string;
}

interface CollectionHooks {
  bypass(): boolean;
  insert(): UnifoldApplicationUpdateStatus;
  mount(): UnifoldApplicationMountStatus;
  move(): UnifoldApplicationUpdateStatus;
  observe(): CollectionObservation;
  reject(): UnifoldApplicationUpdateStatus;
  remove(): UnifoldApplicationUpdateStatus;
}

interface CollectionWindow extends Window {
  __unifoldCollectionFixture?: CollectionHooks;
}

test("reconciles authored collections by durable key and drops stale async work", async ({
  page
}) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-unifold-readiness", "ready");
  expect(await callHook(page, "mount")).toBe(UnifoldApplicationMountStatus.Mounted);
  expect(await callHook(page, "bypass")).toBe(true);
  await page.getByLabel("Alpha").fill("Edited");
  await page.getByLabel("Alpha").focus();
  expect(await callHook(page, "insert")).toBe(UnifoldApplicationUpdateStatus.Applied);
  await assertObservation(page, ["a", "c", "b"], ["field::a", "field::c", "field::b"]);
  await page.getByLabel("Gamma").fill("taken");
  await page.getByLabel("Gamma").focus();
  expect(await callHook(page, "move")).toBe(UnifoldApplicationUpdateStatus.Applied);
  expect((await observe(page)).focusedId).toBe("field::c");
  expect(await callHook(page, "remove")).toBe(UnifoldApplicationUpdateStatus.Applied);
  await expect(page.getByLabel("Gamma")).toHaveCount(0);
  await expect(page.getByLabel("Alpha")).toBeFocused();
  await page.waitForTimeout(400);
  await assertFinalObservation(page);
  expect(await callHook(page, "reject")).toBe(UnifoldApplicationUpdateStatus.Rejected);
  await assertFinalObservation(page);
});

type ScenarioPage = Parameters<typeof callHook>[0];

async function assertObservation(
  page: ScenarioPage,
  authoredKeys: readonly string[],
  renderedIds: readonly string[]
): Promise<void> {
  const observation = await observe(page);
  expect(observation).toMatchObject({
    aggregateValue: authoredKeys.map((key) =>
      key === "a" ? "Edited" : key === "b" ? "Beta" : "Gamma"
    ),
    alphaRetained: true,
    alphaValue: "Edited",
    authoredKeys,
    focusedId: "field::a",
    renderedIds
  });
}

async function assertFinalObservation(page: ScenarioPage): Promise<void> {
  const observation = await observe(page);
  expect(observation).toMatchObject({
    aggregateValue: ["Beta", "Edited"],
    alphaRetained: true,
    alphaValue: "Edited",
    authoredKeys: ["b", "a"],
    focusedId: "field::a",
    focusRequestIds: ["field::a"],
    lateRemovedEvents: 0,
    operationEventsCausal: true,
    operationEventsOriginated: true,
    operationTypes: ["insert", "move", "remove"],
    renderedIds: ["field::b", "field::a"],
    revision: "4"
  });
}

async function callHook(
  page: import("@playwright/test").Page,
  name: Exclude<keyof CollectionHooks, "observe">
): Promise<boolean | UnifoldApplicationMountStatus | UnifoldApplicationUpdateStatus> {
  return page.evaluate((method) => {
    const hooks = (window as unknown as CollectionWindow).__unifoldCollectionFixture;
    if (hooks === undefined) throw new Error("Collection fixture hooks are not installed.");
    return hooks[method]();
  }, name);
}

async function observe(page: import("@playwright/test").Page): Promise<CollectionObservation> {
  return page.evaluate(() => {
    const hooks = (window as unknown as CollectionWindow).__unifoldCollectionFixture;
    if (hooks === undefined) throw new Error("Collection fixture hooks are not installed.");
    return hooks.observe();
  });
}
