import {
  type RenderBaseline,
  type UnifoldHarness,
  readRenderBaseline,
  readRenderUpdates,
  test,
  expect
} from "@unislang/unifold-playwright";
import { assertSelectiveUpdates } from "@unislang/unifold-testkit";
import { UnifoldApplicationUpdateStatus } from "@unislang/unifold";
import { UiCommandType } from "@unislang/unifold-events";
import { ElementEventType } from "@unislang/unifold-elements";
import {
  accessibilityScenario,
  compositionNodeIds,
  expandedAccessibilityScenario
} from "./reference.scenarios.js";
import type { DynamicNode, DynamicUpdateResult, DynamicWindow } from "./reference.types.js";

type ScenarioPage = Parameters<typeof readRenderUpdates>[0];
type CapturedEvent = Awaited<ReturnType<UnifoldHarness["events"]>>[number];
test("mounts the production document from a verified UiModule artifact", async ({ page }) => {
  await page.goto("/");
  const integrity = await page.locator("html").getAttribute("data-unifold-module-integrity");
  expect(integrity).toMatch(/^sha256-[A-Za-z0-9_-]{43}$/u);
});

test("expands the authored composition to deterministic executable node ids", async ({ page }) => {
  await page.goto("/");
  await expect(nodeHost(page, compositionNodeIds.root)).toHaveCount(1);
  await expect(nodeHost(page, compositionNodeIds.form)).toHaveCount(1);
  await expect(nodeHost(page, compositionNodeIds.name)).toHaveCount(1);
  await expect(nodeHost(page, compositionNodeIds.submit)).toHaveCount(1);
});

test("preserves the canonical event envelope through composition expansion", async ({
  page,
  unifold
}) => {
  await page.goto("/");
  await page.getByLabel("Your name").fill("Ada Lovelace");
  await expect.poll(async () => (await unifold.events()).length).toBeGreaterThan(0);
  const event = requireFirstEvent(await unifold.events());
  const snapshot = requireSnapshot(event);
  expect(event.specversion).toBe("1.0");
  expect(event.datacontenttype).toBe("application/json");
  expect(event.data.sourceNode).toMatchObject({ id: compositionNodeIds.name });
  expect(snapshot.properties).toMatchObject({ label: "Your name" });
  expect(snapshot.composition).toMatchObject({
    definitionName: "ProfileEditor",
    definitionVersion: "1.0.0",
    instanceId: compositionNodeIds.root,
    localId: "name"
  });
  expect(event.transactionid).toBeTruthy();
  expect(event.correlationid).toBeTruthy();
  expect(event.staterevision).toBeGreaterThanOrEqual(0);
});

function requireFirstEvent(events: readonly CapturedEvent[]): CapturedEvent {
  const event = events[0];
  if (event === undefined) throw new Error("Expected a canonical event.");
  return event;
}

function requireSnapshot(event: CapturedEvent) {
  const snapshot = event.data.snapshot;
  if (snapshot === undefined) throw new Error("Expected an event snapshot.");
  return snapshot;
}

test("orders component intent and committed facts in one stream", async ({ page, unifold }) => {
  await page.goto("/");
  await page.getByLabel("Your name").fill("Ada Lovelace");
  await expect.poll(async () => (await unifold.events()).length).toBeGreaterThanOrEqual(3);
  const events = await unifold.events();
  const intent = requireEvent(events, 0);
  const command = requireEvent(events, 1);
  const committed = requireEvent(events, 2);
  expect([intent.type, command.type, committed.type]).toEqual([
    "org.unifold.ui.control.input.v1",
    "org.unifold.ui.command.applied.v1",
    "org.unifold.ui.transaction.committed.v1"
  ]);
  expect([intent.sequence, command.sequence, committed.sequence]).toEqual([
    intent.sequence,
    intent.sequence + 1,
    intent.sequence + 2
  ]);
  expect(committed.staterevision).toBeGreaterThan(intent.staterevision);
});

function requireEvent(events: readonly CapturedEvent[], index: number): CapturedEvent {
  const event = events[index];
  if (event === undefined) throw new Error(`Expected canonical event ${index}.`);
  return event;
}

test("updates the changed control without updating its sibling", async ({ page }) => {
  await page.goto("/");
  const baseline = await readRenderBaseline(page, [
    compositionNodeIds.name,
    compositionNodeIds.submit
  ]);
  await page.getByLabel("Your name").fill("Grace Hopper");
  await expect.poll(() => nameUpdateCount(page, baseline)).toBeGreaterThan(0);
  assertSelectiveUpdates(await readRenderUpdates(page, baseline), {
    affectedNodeIds: [compositionNodeIds.name],
    unaffectedNodeIds: [compositionNodeIds.submit]
  });
});

test("publishes JSON-LD from the same committed visible value", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Your name").fill("Ada Lovelace");
  await expect.poll(() => semanticName(page)).toBe("Ada Lovelace");
  await expect(page.getByLabel("Your name")).toHaveValue("Ada Lovelace");
  await expect(page.locator("script[data-unifold-semantics]")).toHaveCount(1);
});

test("submits the runtime-owned form aggregate", async ({ page, unifold }) => {
  await page.goto("/");
  await page.getByLabel("Your name").fill("Margaret Hamilton");
  await page.getByRole("button", { name: "Create greeting" }).click();
  await expect.poll(async () => submittedEvent(unifold)).toBeTruthy();
  const submitted = await requireSubmittedEvent(unifold);
  expect(submitted.data.sourceNode).toMatchObject({ id: compositionNodeIds.form });
  const values = {
    assignee: "ada",
    biography: "",
    confirmName: "",
    contactPreference: "email",
    country: "us",
    name: "Margaret Hamilton",
    newsletter: false,
    skills: ["ts"]
  };
  expect(submitted.data.change).toEqual({ values });
  expect(submittedValue(submitted)).toEqual(values);
});

test("routes native choice and disclosure controls through one stream", async ({
  page,
  unifold
}) => {
  await page.goto("/");
  await page.getByLabel("Receive product updates").check();
  await page.getByLabel("Country").selectOption("ca");
  await page.getByLabel("Skills").selectOption(["ts", "a11y"]);
  await page.getByText("Help and support").press("Enter");
  await expect(page.getByLabel("Receive product updates")).toBeChecked();
  await expect(page.getByLabel("Country")).toHaveValue("ca");
  await expect(page.getByLabel("Skills")).toHaveValues(["ts", "a11y"]);
  await expect.poll(async () => accordionEventValue(await unifold.events())).toBe(true);
  await expect.poll(() => accordionOpen(page)).toBe(true);
  await expect
    .poll(async () => choiceIntentIds(await unifold.events()))
    .toEqual([
      compositionNodeIds.checkbox,
      compositionNodeIds.country,
      compositionNodeIds.multiSelect,
      compositionNodeIds.accordion
    ]);
});

test("reconciles revised authored JSON and retains last-known-good state", async ({
  page,
  unifold
}) => {
  await page.goto("/");
  const name = page.getByLabel("Your name");
  await name.fill("Ada Lovelace");
  await name.focus();
  await rememberStableNode(page, compositionNodeIds.name);
  await expectChoiceUpdateRejected(page);
  await expect(name).toHaveValue("Ada Lovelace");
  const applied = await applyDynamicUpdate(page);
  expect(applied.status).toBe(UnifoldApplicationUpdateStatus.Applied);
  await expect(nodeHost(page, compositionNodeIds.dynamicHelp)).toHaveCount(1);
  await expect(name).toHaveValue("Ada Lovelace");
  await expect(name).toBeFocused();
  expect(await hasStableNode(page, compositionNodeIds.name)).toBe(true);
  expect(await unifold.events()).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        data: expect.objectContaining({
          change: { commandType: UiCommandType.StructureReconcile }
        })
      })
    ])
  );
  await expect.poll(() => semanticName(page)).toBe("Ada Lovelace");
  await expect(nodeHost(page, compositionNodeIds.dynamicHelp)).toHaveCount(1);
  await expect(name).toHaveValue("Ada Lovelace");
});

test("has no serious or critical detectable violations", async ({ unifold }) => {
  await unifold.run(accessibilityScenario);
});

test("has no serious or critical violations when the accordion is expanded", async ({
  unifold
}) => {
  await unifold.run(expandedAccessibilityScenario);
});

async function nameUpdateCount(page: ScenarioPage, baseline: RenderBaseline): Promise<number> {
  const updates = await readRenderUpdates(page, baseline);
  return updates.find((item) => item.nodeId === compositionNodeIds.name)?.updateCount ?? 0;
}

function nodeHost(page: ScenarioPage, nodeId: string) {
  return page.locator(nodeSelector(nodeId));
}

function nodeSelector(nodeId: string): string {
  return `[data-unifold-node-id="${nodeId}"]`;
}

async function rememberStableNode(page: ScenarioPage, nodeId: string): Promise<void> {
  await page.locator(nodeSelector(nodeId)).evaluate((element) => {
    (window as unknown as DynamicWindow).__unifoldStableNode = element;
  });
}

async function hasStableNode(page: ScenarioPage, nodeId: string): Promise<boolean> {
  return page.locator(nodeSelector(nodeId)).evaluate((element) => {
    const target = window as unknown as DynamicWindow;
    return target.__unifoldStableNode === element;
  });
}

async function applyDynamicUpdate(page: ScenarioPage): Promise<DynamicUpdateResult> {
  return page.evaluate(() => {
    function requireForm(
      document: DynamicWindow["__unifoldAuthoredDocument"]
    ): DynamicNode & { $children: DynamicNode[] } {
      const node = document.compositions[0].template.$children.find(({ id }) => id === "form");
      if (node?.$children === undefined) throw new Error("Profile form definition is missing.");
      return node as DynamicNode & { $children: DynamicNode[] };
    }
    const target = window as unknown as DynamicWindow;
    const source = structuredClone(target.__unifoldAuthoredDocument);
    source.revision = "revision-2";
    const form = requireForm(source);
    form.$children.push({
      $comp: "Button",
      id: "dynamic-help",
      label: "Help"
    });
    return target.__unifoldUpdateDocument(source);
  });
}

async function accordionOpen(page: ScenarioPage): Promise<boolean> {
  return nodeHost(page, compositionNodeIds.accordion).evaluate((host) => {
    return host.shadowRoot?.querySelector("details")?.hasAttribute("open") === true;
  });
}

function choiceIntentIds(events: readonly CapturedEvent[]): string[] {
  const ids = choiceNodeIds();
  return events
    .filter((event) => event.type === ElementEventType.ControlInput)
    .map((event) => event.data.sourceNode?.id)
    .filter((id): id is string => id !== undefined && ids.has(id));
}

function accordionEventValue(events: readonly CapturedEvent[]) {
  const event = [...events].reverse().find(isAccordionInput);
  return readEventValue(event?.data.change);
}

function isAccordionInput(event: CapturedEvent): boolean {
  if (event.type !== ElementEventType.ControlInput) return false;
  return event.data.sourceNode?.id === compositionNodeIds.accordion;
}

function readEventValue(change: CapturedEvent["data"]["change"]): unknown {
  if (Object.prototype.toString.call(change) !== "[object Object]") return undefined;
  return (change as Readonly<Record<string, unknown>>)["value"];
}

function choiceNodeIds(): ReadonlySet<string> {
  return new Set([
    compositionNodeIds.checkbox,
    compositionNodeIds.country,
    compositionNodeIds.multiSelect,
    compositionNodeIds.radioGroup,
    compositionNodeIds.accordion
  ]);
}

async function rejectDynamicUpdate(page: ScenarioPage): Promise<DynamicUpdateResult> {
  return page.evaluate(() => {
    function requireForm(
      document: DynamicWindow["__unifoldAuthoredDocument"]
    ): DynamicNode & { $children: DynamicNode[] } {
      const node = document.compositions[0].template.$children.find(({ id }) => id === "form");
      if (node?.$children === undefined) throw new Error("Profile form definition is missing.");
      return node as DynamicNode & { $children: DynamicNode[] };
    }
    const target = window as unknown as DynamicWindow;
    const source = structuredClone(target.__unifoldAuthoredDocument);
    const form = requireForm(source);
    const country = form.$children.find(({ id }) => id === "country");
    if (country === undefined) throw new Error("Country definition is missing.");
    country.options = [
      { label: "United States", value: "us" },
      { label: "United States duplicate", value: "us" }
    ];
    return target.__unifoldUpdateDocument(source);
  });
}

async function expectChoiceUpdateRejected(page: ScenarioPage): Promise<void> {
  const rejected = await rejectDynamicUpdate(page);
  expect(rejected.status).toBe(UnifoldApplicationUpdateStatus.Rejected);
  await expect(page.getByLabel("Country").locator("option")).toHaveCount(3);
}

async function semanticName(page: ScenarioPage): Promise<string | undefined> {
  return page.locator("script[data-unifold-semantics]").evaluate((element, personId) => {
    const value = JSON.parse(element.textContent ?? "{}") as SemanticGraph;
    return value["@graph"].find((entity) => entity["@id"] === personId)?.name;
  }, PROFILE_PERSON_ID);
}

const PROFILE_PERSON_ID = "urn:unifold:person:current";

interface SemanticGraph {
  readonly "@graph": readonly { readonly "@id": string; readonly name?: string }[];
}

async function submittedEvent(unifold: UnifoldHarness) {
  return (await unifold.events()).find((event) => {
    return event.type === "org.unifold.ui.form.submitted.v1";
  });
}

async function requireSubmittedEvent(unifold: UnifoldHarness) {
  const event = await submittedEvent(unifold);
  if (event === undefined) throw new Error("Form submission event is missing.");
  return event;
}

function submittedValue(event: Awaited<ReturnType<typeof requireSubmittedEvent>>) {
  return event.data.snapshot?.control?.value;
}
