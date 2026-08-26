import { UnifoldApplicationUpdateStatus } from "@unislang/unifold";
import { ElementEventType } from "@unislang/unifold-elements";
import { expect, test, type UnifoldHarness } from "@unislang/unifold-playwright";

type CapturedEvent = Awaited<ReturnType<UnifoldHarness["events"]>>[number];

test("selects and reflows a virtualized master-detail workspace", async ({ page, unifold }) => {
  await page.goto("/");
  const initial = await reviseMasterDetail(page, "initial");
  expect(initial.status, JSON.stringify(initial.diagnostics)).toBe(
    UnifoldApplicationUpdateStatus.Applied
  );
  const workspace = page.locator("#app unifold-master-detail");
  const viewport = workspace.locator("[part=viewport]");
  await assertInitialWorkspace(workspace, viewport);
  await rememberWorkspace(workspace);

  await viewport.focus();
  await viewport.press("ArrowDown");
  await viewport.press("Enter");
  await expect(workspace.locator("[part=detail]")).toContainText("Pending <img src=x>");
  await expect(viewport).toBeFocused();
  await expect
    .poll(async () => latestMasterDetailValue(await unifold.events()))
    .toBe("record-00001");
  await unifold.assertAccessibility();

  await assertResponsiveCollapse(page, workspace, viewport);
  await assertRejectedRevision(page, workspace, viewport);
  await assertRecoveredRevision(page, workspace, viewport, unifold);
});

async function assertInitialWorkspace(
  workspace: import("@playwright/test").Locator,
  viewport: import("@playwright/test").Locator
): Promise<void> {
  await expect(workspace).toHaveCount(1);
  expect(await workspace.getByRole("option").count()).toBeLessThanOrEqual(200);
  await expect(workspace.getByRole("option").first()).toHaveAttribute("aria-setsize", "10000");
  await expect(workspace.getByRole("region", { name: "Account details" })).toContainText("Active");
  await expect(viewport).toHaveAttribute("aria-label", "Accounts <script>");
  expect(await workspace.locator("script").count()).toBe(0);
}

async function assertResponsiveCollapse(
  page: import("@playwright/test").Page,
  workspace: import("@playwright/test").Locator,
  viewport: import("@playwright/test").Locator
): Promise<void> {
  await page.setViewportSize({ width: 480, height: 800 });
  await expect
    .poll(async () => workspace.locator('[part="layout"]').evaluate(readGridColumns))
    .not.toContain(" ");
  await expect(viewport).toBeFocused();
}

function readGridColumns(element: Element): string {
  return getComputedStyle(element).gridTemplateColumns;
}

async function assertRejectedRevision(
  page: import("@playwright/test").Page,
  workspace: import("@playwright/test").Locator,
  viewport: import("@playwright/test").Locator
): Promise<void> {
  const rejected = await reviseMasterDetail(page, "invalid");
  expect(rejected.status).toBe(UnifoldApplicationUpdateStatus.Rejected);
  await expect(workspace.getByRole("option").first()).toHaveText("Record 0");
  expect(await retainedWorkspace(workspace)).toBe(true);
  await expect(viewport).toBeFocused();
}

async function assertRecoveredRevision(
  page: import("@playwright/test").Page,
  workspace: import("@playwright/test").Locator,
  viewport: import("@playwright/test").Locator,
  unifold: UnifoldHarness
): Promise<void> {
  expect((await reviseMasterDetail(page, "recovered")).status).toBe(
    UnifoldApplicationUpdateStatus.Applied
  );
  await expect(workspace.getByRole("option").first()).toHaveText("Updated record 0");
  await expect(workspace.locator("[part=detail]")).toContainText("Pending <img src=x>");
  expect(await retainedWorkspace(workspace)).toBe(true);
  await expect(viewport).toBeFocused();
  await unifold.assertAccessibility();
}

function latestMasterDetailValue(events: readonly CapturedEvent[]): unknown {
  const event = [...events].reverse().find(isMasterDetailInput);
  const change = event?.data.change;
  if (Object.prototype.toString.call(change) !== "[object Object]") return undefined;
  return (change as Readonly<Record<string, unknown>>)["value"];
}

function isMasterDetailInput(event: CapturedEvent): boolean {
  return (
    event.type === ElementEventType.ControlInput && event.data.sourceNode?.type === "MasterDetail"
  );
}

async function rememberWorkspace(workspace: import("@playwright/test").Locator): Promise<void> {
  await workspace.evaluate((element) => {
    (window as unknown as MasterDetailWindow).__unifoldStableMasterDetail = element;
  });
}

async function retainedWorkspace(workspace: import("@playwright/test").Locator): Promise<boolean> {
  return workspace.evaluate(
    (element) => (window as unknown as MasterDetailWindow).__unifoldStableMasterDetail === element
  );
}

async function reviseMasterDetail(
  page: import("@playwright/test").Page,
  revision: MasterDetailRevisionName
): Promise<MasterDetailUpdateResult> {
  return page.evaluate(applyMasterDetailUpdate, masterDetailRevision(revision));
}

function applyMasterDetailUpdate(update: MasterDetailRevision): MasterDetailUpdateResult {
  const target = window as unknown as MasterDetailWindow;
  const source = structuredClone(target.__unifoldAuthoredDocument);
  source["compositions"] = [];
  source["machines"] = [];
  delete source["semantics"];
  source.revision = update.revision;
  source.view = {
    $comp: "MasterDetail",
    columns: update.columns,
    detailLabel: "Account details",
    id: source.view.id,
    label: "Accounts <script>",
    masterColumn: update.masterColumn,
    itemHeight: 32,
    rows: update.rows,
    value: "record-00000",
    viewportHeight: 320
  };
  return target.__unifoldUpdateDocument(source);
}

function masterDetailRevision(revision: MasterDetailRevisionName): MasterDetailRevision {
  const recovered = revision === "recovered";
  return {
    columns: [
      { key: "name", label: "Name" },
      { key: "status", label: "Status" }
    ],
    masterColumn: revision === "invalid" ? "missing" : "name",
    revision,
    rows: Array.from({ length: 10_000 }, (_, index) => ({
      cells: {
        name: `${recovered ? "Updated record" : "Record"} ${index}`,
        status: index === 1 ? "Pending <img src=x>" : "Active"
      },
      id: `record-${String(index).padStart(5, "0")}`
    }))
  };
}

type MasterDetailRevisionName = "initial" | "invalid" | "recovered";

interface MasterDetailRevision {
  readonly columns: readonly Readonly<Record<string, string>>[];
  readonly masterColumn: string;
  readonly revision: MasterDetailRevisionName;
  readonly rows: readonly Readonly<Record<string, unknown>>[];
}

interface MasterDetailWindow {
  readonly __unifoldAuthoredDocument: MasterDetailDocument;
  __unifoldStableMasterDetail?: Element;
  readonly __unifoldUpdateDocument: (source: MasterDetailDocument) => MasterDetailUpdateResult;
}

interface MasterDetailDocument extends Record<string, unknown> {
  revision: string;
  view: Record<string, unknown> & { id: string };
}

interface MasterDetailUpdateResult {
  readonly diagnostics?: readonly unknown[];
  readonly status: UnifoldApplicationUpdateStatus;
}
