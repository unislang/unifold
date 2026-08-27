import { expect, test } from "@unislang/unifold-playwright";
import { UnifoldApplicationMountStatus, UnifoldApplicationUpdateStatus } from "@unislang/unifold";

interface CollectionObservation {
  readonly aggregateValue: unknown;
  readonly alphaRetained: boolean;
  readonly alphaValue: unknown;
  readonly authoredKeys: readonly string[];
  readonly focusedId?: string;
  readonly focusCommandEffectIds: readonly string[];
  readonly focusEffectTypes: readonly string[];
  readonly focusLifecycleEffectIds: readonly string[];
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
  empty(): UnifoldApplicationUpdateStatus;
  insert(): UnifoldApplicationUpdateStatus;
  mount(): UnifoldApplicationMountStatus;
  move(): UnifoldApplicationUpdateStatus;
  observe(): CollectionObservation;
  reject(): UnifoldApplicationUpdateStatus;
  remove(): UnifoldApplicationUpdateStatus;
  removeFocused(): UnifoldApplicationUpdateStatus;
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
  await assertEmptyFocusLifecycle(page);
});

test("reports CSS-hidden collection focus as a failed effect", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-unifold-readiness", "ready");
  expect(await callHook(page, "mount")).toBe(UnifoldApplicationMountStatus.Mounted);
  await advanceCollectionToRevisionFour(page);
  await page.getByLabel("Alpha").focus();
  expect(await callHook(page, "removeFocused")).toBe(UnifoldApplicationUpdateStatus.Applied);
  await expect(page.getByLabel("Beta")).toBeFocused();
  const add = page.getByRole("button", { name: "Add item" });
  await add.evaluate((element) => ((element as HTMLElement).style.display = "none"));

  expect(await callHook(page, "empty")).toBe(UnifoldApplicationUpdateStatus.Applied);
  await expect
    .poll(async () => (await observe(page)).focusEffectTypes)
    .toEqual([
      ...successfulFocusEffects(1),
      "org.unifold.ui.effect.requested.v1",
      "org.unifold.ui.effect.failed.v1"
    ]);
  expect((await observe(page)).focusedId).not.toBe("add-item");
  expectCorrelatedFocusEffects(await observe(page), 2);
});

type ScenarioPage = Parameters<typeof callHook>[0];

async function advanceCollectionToRevisionFour(page: ScenarioPage): Promise<void> {
  expect(await callHook(page, "insert")).toBe(UnifoldApplicationUpdateStatus.Applied);
  expect(await callHook(page, "move")).toBe(UnifoldApplicationUpdateStatus.Applied);
  expect(await callHook(page, "remove")).toBe(UnifoldApplicationUpdateStatus.Applied);
}

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
    focusEffectTypes: successfulFocusEffects(1),
    focusRequestIds: ["field::a"],
    lateRemovedEvents: 0,
    operationEventsCausal: true,
    operationEventsOriginated: true,
    operationTypes: ["insert", "move", "remove"],
    renderedIds: ["field::b", "field::a"],
    revision: "4"
  });
  expectCorrelatedFocusEffects(observation, 1);
}

async function assertEmptyFocusLifecycle(page: ScenarioPage): Promise<void> {
  expect(await callHook(page, "removeFocused")).toBe(UnifoldApplicationUpdateStatus.Applied);
  await expect(page.getByLabel("Beta")).toBeFocused();
  expect(await observe(page)).toMatchObject({
    aggregateValue: ["Beta"],
    authoredKeys: ["b"],
    focusEffectTypes: successfulFocusEffects(2),
    focusRequestIds: ["field::a", "field::b"],
    revision: "5"
  });
  expectCorrelatedFocusEffects(await observe(page), 2);
  expect(await callHook(page, "empty")).toBe(UnifoldApplicationUpdateStatus.Applied);
  await expect(page.getByRole("button", { name: "Add item" })).toBeFocused();
  expect(await observe(page)).toMatchObject({
    aggregateValue: [],
    authoredKeys: [],
    focusEffectTypes: successfulFocusEffects(3),
    focusRequestIds: ["field::a", "field::b", "add-item"],
    focusedId: "add-item",
    renderedIds: [],
    revision: "6"
  });
  expectCorrelatedFocusEffects(await observe(page), 3);
}

function expectCorrelatedFocusEffects(observation: CollectionObservation, count: number): void {
  const lifecyclePairs = Array.from({ length: count }, (_, index) =>
    observation.focusLifecycleEffectIds.slice(index * 2, index * 2 + 2)
  );
  expect(lifecyclePairs).toEqual(
    observation.focusCommandEffectIds.map((effectId) => [effectId, effectId])
  );
  expect(new Set(observation.focusCommandEffectIds).size).toBe(count);
}

function successfulFocusEffects(count: number): readonly string[] {
  return Array.from({ length: count }).flatMap(() => [
    "org.unifold.ui.effect.requested.v1",
    "org.unifold.ui.effect.completed.v1"
  ]);
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
