import { expect, readRenderBaseline, readRenderUpdates, test } from "@unislang/unifold-playwright";
import { assertSelectiveUpdates } from "@unislang/unifold-testkit";

import { compositionNodeIds } from "./reference.scenarios.js";

interface AuthorityObservation {
  readonly applicationRevision: number;
  readonly causalEventIds: readonly string[];
  readonly componentNotifications: number;
  readonly componentValue: unknown;
  readonly compositionNotifications: number;
  readonly compositionValue: unknown;
  readonly formNotifications: number;
  readonly formValue: unknown;
  readonly machineState: unknown;
  readonly machineTransactionCount: number;
  readonly revisionBefore: number;
  readonly valueWriteCount: number;
  readonly viewsShareEventIdentity: boolean;
}

interface AuthorityWindow {
  __unifoldBeginStateAuthorityTrace(): void;
  __unifoldReadStateAuthorityTrace(): AuthorityObservation;
}

test("proves one causal field write through every observable view and XState", async ({ page }) => {
  await prepareSubmittedState(page);
  await beginTrace(page);
  const baseline = await readRenderBaseline(page, authorityNodeIds());
  await page.getByLabel("Your name").fill("Grace Hopper");
  await expect(page.getByRole("button", { name: "Create greeting" })).toBeVisible();
  await expect
    .poll(() => readObservation(page).then(({ valueWriteCount }) => valueWriteCount))
    .toBe(1);
  const observation = await readObservation(page);
  assertAuthorityObservation(observation);
  assertSelectiveUpdates(await readRenderUpdates(page, baseline), {
    affectedNodeIds: [compositionNodeIds.name, compositionNodeIds.submit],
    unaffectedNodeIds: [compositionNodeIds.country]
  });
});

async function prepareSubmittedState(page: Parameters<typeof readRenderUpdates>[0]): Promise<void> {
  await page.goto("/");
  await page.getByLabel("Your name").fill("Ada Lovelace");
  await page.getByLabel("Confirm name").fill("Ada Lovelace");
  await page.getByRole("button", { name: "Create greeting" }).click();
  await expect(page.getByRole("button", { name: "Submitted" })).toBeVisible();
}

async function beginTrace(page: Parameters<typeof readRenderUpdates>[0]): Promise<void> {
  await page.evaluate(() =>
    (window as unknown as AuthorityWindow).__unifoldBeginStateAuthorityTrace()
  );
}

function assertAuthorityObservation(observation: AuthorityObservation): void {
  expect(observation).toMatchObject({
    componentNotifications: 1,
    componentValue: "Grace Hopper",
    compositionNotifications: 1,
    compositionValue: "Grace Hopper",
    formNotifications: 1,
    formValue: "Grace Hopper",
    machineState: "editing",
    machineTransactionCount: 1,
    valueWriteCount: 1,
    viewsShareEventIdentity: true
  });
  expect(observation.applicationRevision).toBeGreaterThan(observation.revisionBefore);
  expect(observation.causalEventIds).toHaveLength(3);
}

function authorityNodeIds(): readonly string[] {
  return [compositionNodeIds.name, compositionNodeIds.submit, compositionNodeIds.country];
}

async function readObservation(page: Parameters<typeof readRenderUpdates>[0]) {
  return page.evaluate(() =>
    (window as unknown as AuthorityWindow).__unifoldReadStateAuthorityTrace()
  );
}
