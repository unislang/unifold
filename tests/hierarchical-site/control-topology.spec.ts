import {
  expect,
  readRenderBaseline,
  readRenderUpdates,
  test,
  type UnifoldHarness
} from "@unislang/unifold-playwright";
import { assertSelectiveUpdates } from "@unislang/unifold-testkit";
import type { Locator, Page } from "@playwright/test";

const FORM_ID = "topology-form";
const INTENT_PHASE = "intent";
type CapturedEvent = Awaited<ReturnType<UnifoldHarness["events"]>>[number];

enum TopologyEventType {
  FormReset = "org.unifold.ui.form.reset.v1",
  FormSubmitted = "org.unifold.ui.form.submitted.v1"
}

interface ControlSnapshot {
  readonly base: { readonly disabled: boolean; readonly ownDisabled?: boolean };
  readonly control?: {
    readonly rawValue: unknown;
    readonly status: string;
    readonly value: unknown;
  };
  readonly controlParentId?: string;
  readonly parentId?: string;
  readonly revision: number;
}

const populatedValue = {
  aliases: ["Countess", "Enchantress"],
  contacts: { home: "home@example.com", work: "work@example.com" },
  identity: { name: "Ada Lovelace", title: "Ada" }
};

const emptyValue = {
  aliases: ["", ""],
  contacts: { home: "", work: "" },
  identity: { name: "", title: "" }
};

test("executes a JSON-authored logical form topology end to end", async ({ page, unifold }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute(
    "data-unifold-topology-integrity",
    /^sha256-/u
  );
  await expectNormalizedOutput(page, emptyValue);
  await verifySelectiveLogicalUpdate(page, unifold);
  await fillRemainingControls(page);
  await verifyNestedAndNativeValues(page);
  await verifyAggregateDisabledPropagation(page);
  await verifySubmission(page, unifold);
  await verifySemanticProjection(page);
  await verifyReset(page, unifold);
  await unifold.assertAccessibility();
});

async function verifySelectiveLogicalUpdate(page: Page, unifold: UnifoldHarness): Promise<void> {
  await clearEvents(page);
  const baseline = await readRenderBaseline(page, [
    "legal-name",
    "preferred-name",
    "primary-alias",
    "aliases-array",
    "contacts-record"
  ]);
  await page.getByLabel("Legal name").fill("Ada Lovelace");
  await expect(page.getByTestId("topology-machine-state")).toHaveText("changed");
  assertSelectiveUpdates(await readRenderUpdates(page, baseline), {
    affectedNodeIds: ["legal-name"],
    unaffectedNodeIds: ["preferred-name", "primary-alias", "aliases-array", "contacts-record"]
  });
  await verifyLogicalSnapshots(page);
  await verifyLogicalEvent(unifold);
}

async function verifyLogicalSnapshots(page: Page): Promise<void> {
  const legal = await controlSnapshot(page, "legal-name");
  const group = await controlSnapshot(page, "identity-group");
  const form = await controlSnapshot(page, FORM_ID);
  const aliases = await controlSnapshot(page, "aliases-array");
  expect(legal).toMatchObject({ controlParentId: "identity-group", parentId: "identity-fields" });
  expect(group).toMatchObject({ control: { value: { name: "Ada Lovelace", title: "" } } });
  expect(form).toMatchObject({ control: { value: { identity: group.control?.value } } });
  expect(group.revision).toBeGreaterThan(aliases.revision);
  expect(form.revision).toBe(group.revision);
}

async function verifyLogicalEvent(unifold: UnifoldHarness): Promise<void> {
  await expect.poll(async () => legalNameIntent(await unifold.events())).toBeDefined();
  const event = requireLegalNameIntent(await unifold.events());
  expect(requireSourceNode(event).scopePath).toEqual(
    expect.arrayContaining([FORM_ID, "identity-group", "legal-name"])
  );
  expect(event.data.snapshot).toMatchObject({
    controlKey: "name",
    controlParentId: "identity-group",
    parentId: "identity-fields"
  });
}

function requireLegalNameIntent(events: readonly CapturedEvent[]): CapturedEvent {
  const event = legalNameIntent(events);
  if (event === undefined) throw new Error("Legal-name intent was not captured.");
  return event;
}

function requireSourceNode(event: CapturedEvent): NonNullable<CapturedEvent["data"]["sourceNode"]> {
  const sourceNode = event.data.sourceNode;
  if (sourceNode === undefined) throw new Error("Logical event source is unavailable.");
  return sourceNode;
}

function legalNameIntent(events: readonly CapturedEvent[]): CapturedEvent | undefined {
  return events.find(
    (event) =>
      String(event.data.phase) === INTENT_PHASE && event.data.sourceNode?.id === "legal-name"
  );
}

async function fillRemainingControls(page: Page): Promise<void> {
  await page.getByLabel("Preferred name").fill("Ada");
  await page.getByLabel("Primary alias").fill("Countess");
  await page.getByLabel("Secondary alias").fill("Enchantress");
  await page.getByLabel("Work email").fill("work@example.com");
  await page.getByLabel("Home email").fill("home@example.com");
}

async function verifyNestedAndNativeValues(page: Page): Promise<void> {
  await expectNormalizedOutput(page, populatedValue);
  expect(await nativeEntries(page.getByLabel("Legal name"))).toEqual([
    ["identity.name", "Ada Lovelace"],
    ["identity.title", "Ada"],
    ["aliases", "Countess"],
    ["aliases", "Enchantress"],
    ["contacts.work", "work@example.com"],
    ["contacts.home", "home@example.com"]
  ]);
}

async function verifyAggregateDisabledPropagation(page: Page): Promise<void> {
  await verifyDisabledAggregate(page);
  await verifyOwnDisabledState(page);
  await verifyRestoredAggregate(page);
}

async function verifyDisabledAggregate(page: Page): Promise<void> {
  await setControlDisabled(page, "identity-group", true);
  await expectNormalizedOutput(page, {
    aliases: populatedValue.aliases,
    contacts: populatedValue.contacts
  });
  await expect(page.getByLabel("Legal name")).toBeDisabled();
  await expect(page.getByLabel("Preferred name")).toBeDisabled();
  expect(await nativeEntries(page.getByLabel("Legal name"))).toEqual([
    ["aliases", "Countess"],
    ["aliases", "Enchantress"],
    ["contacts.work", "work@example.com"],
    ["contacts.home", "home@example.com"]
  ]);
  expect(await controlSnapshot(page, "identity-group")).toMatchObject({
    base: { disabled: true, ownDisabled: true },
    control: { rawValue: populatedValue.identity, status: "disabled" }
  });
  expect(await controlSnapshot(page, "legal-name")).toMatchObject({
    base: { disabled: true, ownDisabled: false },
    control: { status: "disabled", value: "Ada Lovelace" }
  });
}

async function verifyOwnDisabledState(page: Page): Promise<void> {
  await setControlDisabled(page, "legal-name", true);
  await setControlDisabled(page, "identity-group", false);
  expect(await controlSnapshot(page, "preferred-name")).toMatchObject({
    base: { disabled: false, ownDisabled: false }
  });
  expect(await renderedDisabledState(page.getByLabel("Preferred name"))).toEqual({
    eventDisabled: false,
    hostDisabled: false,
    inputDisabled: false
  });
  await expect(page.getByLabel("Preferred name")).toBeEnabled();
  await expect(page.getByLabel("Legal name")).toBeDisabled();
  await expectNormalizedOutput(page, {
    ...populatedValue,
    identity: { title: "Ada" }
  });
}

async function verifyRestoredAggregate(page: Page): Promise<void> {
  await setControlDisabled(page, "legal-name", false);
  await expect(page.getByLabel("Legal name")).toBeEnabled();
  await expectNormalizedOutput(page, populatedValue);
  expect(await nativeEntries(page.getByLabel("Legal name"))).toEqual([
    ["identity.name", "Ada Lovelace"],
    ["identity.title", "Ada"],
    ["aliases", "Countess"],
    ["aliases", "Enchantress"],
    ["contacts.work", "work@example.com"],
    ["contacts.home", "home@example.com"]
  ]);
}

async function verifySubmission(page: Page, unifold: UnifoldHarness): Promise<void> {
  await page.getByRole("button", { name: "Submit topology" }).click();
  await expect
    .poll(async () => formResult(await unifold.events(), TopologyEventType.FormSubmitted))
    .toMatchObject({
      data: { change: { values: populatedValue } },
      type: TopologyEventType.FormSubmitted
    });
}

async function verifyReset(page: Page, unifold: UnifoldHarness): Promise<void> {
  await page.getByRole("button", { name: "Reset topology" }).click();
  await expectNormalizedOutput(page, emptyValue);
  await expect
    .poll(async () => formResult(await unifold.events(), TopologyEventType.FormReset))
    .toMatchObject({
      data: { change: { values: emptyValue } },
      type: TopologyEventType.FormReset
    });
}

function formResult(
  events: readonly CapturedEvent[],
  type: TopologyEventType
): CapturedEvent | undefined {
  return [...events]
    .reverse()
    .find((event) => event.type === type && event.data.sourceNode?.id === FORM_ID);
}

async function verifySemanticProjection(page: Page): Promise<void> {
  await expect
    .poll(() => profileEntity(page))
    .toMatchObject({
      email: "work@example.com",
      givenName: "Countess",
      name: "Ada Lovelace"
    });
}

async function profileEntity(page: Page): Promise<unknown> {
  return page.locator("script[data-unifold-semantics]").evaluateAll((elements) => {
    const entities = elements.flatMap((element) => {
      const value = JSON.parse(element.textContent ?? "{}") as { "@graph": JsonLdEntity[] };
      return value["@graph"];
    });
    return entities.find((entity) => entity["@id"] === "urn:unifold:example:profile");
  });
}

async function expectNormalizedOutput(page: Page, value: unknown): Promise<void> {
  await expect.poll(() => normalizedOutput(page)).toEqual(value);
}

async function normalizedOutput(page: Page): Promise<unknown> {
  return page
    .getByTestId("topology-snapshot")
    .evaluate((element) => JSON.parse(element.textContent ?? "null"));
}

async function controlSnapshot(page: Page, id: string): Promise<ControlSnapshot> {
  return page.evaluate((nodeId) => {
    const reader = Reflect.get(window, "__unifoldControlSnapshot") as
      | ((value: string) => ControlSnapshot)
      | undefined;
    if (reader === undefined) throw new Error("Control snapshot reader is unavailable.");
    return reader(nodeId);
  }, id);
}

async function setControlDisabled(page: Page, id: string, disabled: boolean): Promise<void> {
  await page.evaluate(
    ({ controlId, value }) => {
      const execute = Reflect.get(window, "__unifoldExecute") as
        | ((commands: readonly unknown[]) => unknown)
        | undefined;
      if (execute === undefined) throw new Error("Runtime command executor is unavailable.");
      execute([{ disabled: value, id: controlId, type: "control.set-disabled" }]);
    },
    { controlId: id, value: disabled }
  );
}

async function nativeEntries(control: Locator): Promise<readonly (readonly [string, string])[]> {
  return control.evaluate((element) => {
    const root = element.getRootNode();
    const host = root instanceof ShadowRoot ? root.host : element;
    const form = Reflect.get(host, "form") as HTMLFormElement | null;
    if (form === null) throw new Error("Native form owner is unavailable.");
    return [...new FormData(form).entries()].map(([name, value]) => [name, String(value)]);
  });
}

async function renderedDisabledState(control: Locator): Promise<Record<string, unknown>> {
  return control.evaluate((element) => {
    const root = element.getRootNode();
    const host = root instanceof ShadowRoot ? root.host : element;
    const eventNode = Reflect.get(host, "eventNode");
    const eventDisabled = (value: unknown) =>
      (value as { base?: { disabled?: boolean } } | undefined)?.base?.disabled;
    return {
      eventDisabled: eventDisabled(eventNode),
      hostDisabled: Reflect.get(host, "disabled"),
      inputDisabled: Reflect.get(element, "disabled")
    };
  });
}

async function clearEvents(page: Page): Promise<void> {
  await page.evaluate(() => Reflect.set(window, "__unifoldCapturedEvents", []));
}

interface JsonLdEntity {
  readonly "@id": string;
  readonly email?: string;
  readonly givenName?: string;
  readonly name?: string;
}
