import { ElementEventType } from "@unislang/unifold-elements";
import { UnifoldApplicationUpdateStatus } from "@unislang/unifold";
import {
  expect,
  readRenderBaseline,
  readRenderUpdates,
  test,
  type UnifoldHarness
} from "@unislang/unifold-playwright";
import { assertSelectiveUpdates } from "@unislang/unifold-testkit";

import { compositionNodeIds } from "./reference.scenarios.js";

type CapturedEvent = Awaited<ReturnType<UnifoldHarness["events"]>>[number];

test("switches stable tab panels through canonical controlled state", async ({ page, unifold }) => {
  await page.goto("/");
  const baseline = await readRenderBaseline(page, [
    compositionNodeIds.accountTabs,
    compositionNodeIds.accordion
  ]);
  const host = page.getByTestId("account-tabs");
  const summary = host.getByRole("tabpanel", { includeHidden: true, name: "Summary" });
  const activity = host.getByRole("tabpanel", { includeHidden: true, name: "Activity" });
  await expect(host.locator(":scope > unifold-text")).toHaveCount(3);
  await rememberIdentity(host);
  await assertInitialTabs(host, summary);
  await selectActivity(host, summary, activity);
  expect(await retainedIdentity(host)).toBe(true);
  assertTabIntent(requireTabIntent(await unifold.events()));
  assertSelectiveUpdates(await readRenderUpdates(page, baseline), {
    affectedNodeIds: [compositionNodeIds.accountTabs],
    unaffectedNodeIds: [compositionNodeIds.accordion]
  });
  await unifold.assertAccessibility();
  await assertRecovery(page, host);
});

async function assertInitialTabs(
  host: import("@playwright/test").Locator,
  summary: import("@playwright/test").Locator
): Promise<void> {
  await expect(host.getByRole("tablist", { name: "Account sections" })).toHaveAttribute(
    "aria-orientation",
    "horizontal"
  );
  await expect(host.getByRole("tab", { name: "Billing" })).toBeDisabled();
  await expect(host.getByRole("tab", { name: "Summary" })).toHaveAttribute(
    "aria-controls",
    `${compositionNodeIds.accountTabs}__tabpanel_0`
  );
  await expect(summary).toHaveAttribute(
    "aria-labelledby",
    `${compositionNodeIds.accountTabs}__tab_0`
  );
  await expect(summary).toBeVisible();
}

async function selectActivity(
  host: import("@playwright/test").Locator,
  summary: import("@playwright/test").Locator,
  activity: import("@playwright/test").Locator
): Promise<void> {
  await host.getByRole("tab", { name: "Summary" }).focus();
  await host.getByRole("tab", { name: "Summary" }).press("ArrowRight");

  await expect(host.getByRole("tab", { name: "Activity" })).toBeFocused();
  await expect(host.getByRole("tab", { name: "Activity" })).toHaveAttribute(
    "aria-selected",
    "true"
  );
  await expect(activity).toBeVisible();
  await expect(summary).toBeHidden();
}

function assertTabIntent(event: CapturedEvent): void {
  expect(event.data.sourceNode).toMatchObject({
    id: compositionNodeIds.accountTabs,
    type: "Tabs",
    version: "1.0.0"
  });
  expect(event.data.change).toEqual({ value: "activity" });
  expect(event.data.snapshot?.control?.value).toBe("summary");
}

function requireTabIntent(events: readonly CapturedEvent[]): CapturedEvent {
  const event = [...events].reverse().find((candidate) => {
    return (
      candidate.type === ElementEventType.ControlInput &&
      candidate.data.sourceNode?.id === compositionNodeIds.accountTabs
    );
  });
  if (event === undefined) throw new Error("Tabs input event is missing.");
  return event;
}

async function assertRecovery(
  page: import("@playwright/test").Page,
  host: import("@playwright/test").Locator
): Promise<void> {
  expect((await updateTabs(page, true)).status).toBe(UnifoldApplicationUpdateStatus.Rejected);
  expect(await retainedIdentity(host)).toBe(true);
  expect((await updateTabs(page, false)).status).toBe(UnifoldApplicationUpdateStatus.Applied);
  await expect(host.getByRole("tab", { name: "Updated Summary" })).toHaveCount(1);
  expect(await retainedIdentity(host)).toBe(true);
}

async function rememberIdentity(host: import("@playwright/test").Locator): Promise<void> {
  await host.evaluate((element) => {
    const target = window as unknown as TabsWindow;
    const panel = element.querySelector('[data-unifold-node-id$="::summary-panel"]');
    if (panel === null) throw new Error("Authored tab panel is missing.");
    target.__unifoldStableTabs = element;
    target.__unifoldStableTabPanel = panel;
  });
}

async function retainedIdentity(host: import("@playwright/test").Locator): Promise<boolean> {
  return host.evaluate((element) => {
    const target = window as unknown as TabsWindow;
    const panel = element.querySelector('[data-unifold-node-id$="::summary-panel"]');
    return target.__unifoldStableTabs === element && target.__unifoldStableTabPanel === panel;
  });
}

function updateTabs(page: import("@playwright/test").Page, invalid: boolean) {
  return page.evaluate((duplicate) => {
    function requireTabs(document: TabsDocument): TabsNode {
      const node = document.compositions[0].template.$children.find(
        (candidate): candidate is TabsNode =>
          candidate.id === "account-tabs" && candidate.tabs !== undefined
      );
      if (node === undefined) throw new Error("Account tabs definition is missing.");
      return node;
    }
    const target = window as unknown as TabsWindow;
    const source = structuredClone(target.__unifoldAuthoredDocument) as TabsDocument;
    source.revision = { false: "tabs-recovered", true: "tabs-invalid" }[
      String(duplicate)
    ] as string;
    const tabs = requireTabs(source);
    const first = tabs.tabs[0];
    const third = tabs.tabs[2];
    if (first === undefined) throw new Error("First tab is missing.");
    if (third === undefined) throw new Error("Third tab is missing.");
    first.label = "Updated Summary";
    third.id = { false: "activity", true: "summary" }[String(duplicate)] as string;
    return target.__unifoldUpdateDocument(source);
  }, invalid);
}

interface TabsWindow {
  readonly __unifoldAuthoredDocument: TabsDocument;
  readonly __unifoldUpdateDocument: (source: TabsDocument) => UpdateResult;
  __unifoldStableTabs?: Element;
  __unifoldStableTabPanel?: Element;
}

interface TabsDocument {
  readonly compositions: readonly [{ readonly template: { readonly $children: AuthoredNode[] } }];
  revision: string;
}

interface AuthoredNode {
  readonly id: string;
  readonly tabs?: { id: string; label: string }[];
}

interface TabsNode {
  readonly id: string;
  readonly tabs: { id: string; label: string }[];
}

interface UpdateResult {
  readonly status: UnifoldApplicationUpdateStatus;
}
