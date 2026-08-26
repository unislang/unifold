import { expect, test, type UnifoldHarness } from "@unislang/unifold-playwright";
import {
  UnifoldApplicationDiagnosticStage,
  UnifoldApplicationUpdateStatus
} from "@unislang/unifold";
import { ElementEventType } from "@unislang/unifold-elements";
import { UiCommandType } from "@unislang/unifold-events";
import type { Locator, Page } from "@playwright/test";

const OLD_NODE_ID = "profile-editor::name";
const NEW_NODE_ID = "profile-editor::full-name";
const STABLE_NODE_ID = "profile-editor::slot:actions::submit";

test("rejects an unreviewed version then preserves state, focus, semantics, and event identity", async ({
  page,
  unifold
}) => {
  await page.goto("/");
  const oldField = page.getByLabel("Your name");
  await oldField.fill("Ada Lovelace");
  await expect.poll(() => semanticName(page)).toBe("Ada Lovelace");
  await oldField.focus();
  await rememberStableNode(page);
  await expectRejectedMigration(page, oldField);
  const newField = await expectPreservedMigration(page, unifold);
  await expectMigratedInput(page, unifold, newField);
});

async function expectRejectedMigration(page: Page, oldField: Locator): Promise<void> {
  expect(await migrateProfile(page, "unreviewed")).toMatchObject({
    diagnostics: [{ stage: UnifoldApplicationDiagnosticStage.Composition }],
    status: UnifoldApplicationUpdateStatus.Rejected
  });
  await expect(oldField).toHaveValue("Ada Lovelace");
  await expect(oldField).toBeFocused();
}

async function expectPreservedMigration(page: Page, unifold: UnifoldHarness): Promise<Locator> {
  const applied = await migrateProfile(page, "preserve");
  expect(applied.status).toBe(UnifoldApplicationUpdateStatus.Applied);
  const newField = page.getByLabel("Full name");
  await expect(newField).toHaveValue("Ada Lovelace");
  await expect(newField).toBeFocused();
  await expect(nodeHost(page, OLD_NODE_ID)).toHaveCount(0);
  expect(await hasStableNode(page)).toBe(true);
  await expect.poll(() => semanticName(page)).toBe("Ada Lovelace");
  await unifold.assertAccessibility();
  return newField;
}

async function expectMigratedInput(
  page: Page,
  unifold: UnifoldHarness,
  newField: Locator
): Promise<void> {
  const eventStart = (await unifold.events()).length;
  await newField.fill("Grace Hopper");
  const input = await requireMigratedInput(unifold, eventStart);
  expect(input.data.sourceNode).toMatchObject({ id: NEW_NODE_ID });
  expect(input.data.snapshot?.composition).toMatchObject({
    definitionName: "ProfileEditor",
    definitionVersion: "2.0.0",
    instanceId: "profile-editor",
    localId: "full-name"
  });
  expect(input).toMatchObject({ datacontenttype: "application/json", specversion: "1.0" });
  expect(input.correlationid).toBeTruthy();
  expect(input.transactionid).toBeTruthy();
  await expect.poll(() => semanticName(page)).toBe("Grace Hopper");
}

test("resets unmapped state to successor defaults without restoring removed focus", async ({
  page,
  unifold
}) => {
  await page.goto("/");
  const oldField = page.getByLabel("Your name");
  await oldField.fill("User value");
  await oldField.focus();
  const eventStart = (await unifold.events()).length;

  const applied = await migrateProfile(page, "reset");
  expect(applied.status).toBe(UnifoldApplicationUpdateStatus.Applied);
  const newField = page.getByLabel("Full name");
  await expect(newField).toHaveValue("Successor default");
  await expect(newField).not.toBeFocused();
  await expect(nodeHost(page, OLD_NODE_ID)).toHaveCount(0);
  await expect.poll(() => semanticName(page)).toBe("Successor default");
  await expect.poll(async () => hasReconcileEvent(await unifold.events(), eventStart)).toBe(true);
  await unifold.assertAccessibility();
});

function migrateProfile(page: Page, mode: ProfileMigrationMode): Promise<MigrationResult> {
  return page.evaluate((migrationMode) => {
    const hook = (window as unknown as MigrationWindow).__unifoldMigrateProfile;
    if (hook === undefined) throw new Error("Composition migration hook is missing.");
    return hook(migrationMode);
  }, mode);
}

async function requireMigratedInput(unifold: UnifoldHarness, start: number) {
  await expect
    .poll(async () => migratedInput(await unifold.events(), start) !== undefined)
    .toBe(true);
  const event = migratedInput(await unifold.events(), start);
  if (event === undefined) throw new Error("Migrated input event is missing.");
  return event;
}

function migratedInput(events: Awaited<ReturnType<UnifoldHarness["events"]>>, start: number) {
  return events.slice(start).find((event) => event.type === ElementEventType.ControlInput);
}

function hasReconcileEvent(
  events: Awaited<ReturnType<UnifoldHarness["events"]>>,
  start: number
): boolean {
  return events.slice(start).some((event) => {
    return changeCommandType(event.data.change) === UiCommandType.StructureReconcile;
  });
}

function changeCommandType(change: unknown): unknown {
  if (Object.prototype.toString.call(change) !== "[object Object]") return undefined;
  return (change as Readonly<Record<string, unknown>>)["commandType"];
}

function nodeHost(page: Page, nodeId: string) {
  return page.locator(`[data-unifold-node-id="${nodeId}"]`);
}

async function rememberStableNode(page: Page): Promise<void> {
  await page.locator(`[data-unifold-node-id="${STABLE_NODE_ID}"]`).evaluate((element) => {
    (window as unknown as MigrationWindow).__unifoldStableMigrationNode = element;
  });
}

function hasStableNode(page: Page): Promise<boolean> {
  return page.locator(`[data-unifold-node-id="${STABLE_NODE_ID}"]`).evaluate((element) => {
    const target = window as unknown as MigrationWindow;
    return target.__unifoldStableMigrationNode === element;
  });
}

function semanticName(page: Page): Promise<string | undefined> {
  return page.locator("script[data-unifold-semantics]").evaluate((element, personId) => {
    const value = JSON.parse(element.textContent ?? "{}") as SemanticGraph;
    return value["@graph"].find((entity) => entity["@id"] === personId)?.name;
  }, PROFILE_PERSON_ID);
}

const PROFILE_PERSON_ID = "urn:unifold:person:current";

interface SemanticGraph {
  readonly "@graph": readonly { readonly "@id": string; readonly name?: string }[];
}

type ProfileMigrationMode = "preserve" | "reset" | "unreviewed";

interface MigrationResult {
  readonly diagnostics: readonly { readonly stage: UnifoldApplicationDiagnosticStage }[];
  readonly status: UnifoldApplicationUpdateStatus;
}

interface MigrationWindow {
  __unifoldMigrateProfile?: (mode: ProfileMigrationMode) => MigrationResult;
  __unifoldStableMigrationNode?: Element | null;
}
