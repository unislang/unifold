import { UnifoldApplicationUpdateStatus } from "@unislang/unifold";
import { ElementEventType } from "@unislang/unifold-elements";
import { expect, test, type UnifoldHarness } from "@unislang/unifold-playwright";

type CapturedEvent = Awaited<ReturnType<UnifoldHarness["events"]>>[number];

test("sorts and selects native JSON grid rows through canonical state", async ({
  page,
  unifold
}) => {
  await page.goto("/");
  expect((await reviseDataGrid(page, "initial")).status).toBe(
    UnifoldApplicationUpdateStatus.Applied
  );
  const grid = page.locator("#app unifold-data-grid");
  await assertInitialGrid(grid);
  await rememberGrid(grid);
  await exerciseGrid(grid, unifold);
  await assertRejectedRevision(page, grid);
  await assertRecoveredRevision(page, grid, unifold);
});

async function assertInitialGrid(grid: import("@playwright/test").Locator): Promise<void> {
  await expect(grid).toHaveCount(1);
  await expect(grid.locator("table")).toHaveAccessibleName("People <script>");
  await expect(grid.getByRole("columnheader")).toHaveText(["", "Name", "Age"]);
  await expect(grid.getByRole("rowheader")).toHaveText(["Grace <img src=x>", "Ada"]);
  await expect(grid.locator("img")).toHaveCount(0);
}

async function exerciseGrid(
  grid: import("@playwright/test").Locator,
  unifold: UnifoldHarness
): Promise<void> {
  const sortButton = grid.getByRole("button", { name: "Name" });
  await sortButton.focus();
  await sortButton.press("Enter");
  await expect(grid.locator('th[aria-sort="ascending"]')).toContainText("Name");
  await expect(grid.getByRole("rowheader")).toHaveText(["Ada", "Grace <img src=x>"]);
  await expect(sortButton).toBeFocused();

  const selection = grid.getByRole("checkbox", { name: "Select Ada" });
  await selection.focus();
  await selection.press("Space");
  await expect(selection).toBeChecked();
  await expect(selection).toBeFocused();
  await expect
    .poll(async () => latestGridValue(await unifold.events()))
    .toEqual({
      selectedRowIds: ["ada"],
      sort: { direction: "ascending", key: "name" }
    });
  await unifold.assertAccessibility();
}

async function assertRejectedRevision(
  page: import("@playwright/test").Page,
  grid: import("@playwright/test").Locator
): Promise<void> {
  const rejected = await reviseDataGrid(page, "invalid");
  expect(rejected.status).toBe(UnifoldApplicationUpdateStatus.Rejected);
  await expect(grid.getByRole("rowheader")).toHaveText(["Ada", "Grace <img src=x>"]);
  expect(await retainedGrid(grid)).toBe(true);
}

async function assertRecoveredRevision(
  page: import("@playwright/test").Page,
  grid: import("@playwright/test").Locator,
  unifold: UnifoldHarness
): Promise<void> {
  expect((await reviseDataGrid(page, "recovered")).status).toBe(
    UnifoldApplicationUpdateStatus.Applied
  );
  await expect(grid.getByRole("rowheader")).toHaveText(["Linus"]);
  expect(await retainedGrid(grid)).toBe(true);
  await unifold.assertAccessibility();
}

function latestGridValue(events: readonly CapturedEvent[]): unknown {
  const event = [...events].reverse().find(isGridInput);
  const change = event?.data.change;
  if (Object.prototype.toString.call(change) !== "[object Object]") return undefined;
  return (change as Readonly<Record<string, unknown>>)["value"];
}

function isGridInput(event: CapturedEvent): boolean {
  if (event.type !== ElementEventType.ControlInput) return false;
  return event.data.sourceNode?.type === "DataGrid";
}

async function rememberGrid(grid: import("@playwright/test").Locator): Promise<void> {
  await grid.evaluate((element) => {
    (window as unknown as DataGridWindow).__unifoldStableDataGrid = element;
  });
}

async function retainedGrid(grid: import("@playwright/test").Locator): Promise<boolean> {
  return grid.evaluate((element) => {
    return (window as unknown as DataGridWindow).__unifoldStableDataGrid === element;
  });
}

async function reviseDataGrid(
  page: import("@playwright/test").Page,
  revision: DataGridRevisionName
): Promise<DataGridUpdateResult> {
  return page.evaluate(applyDataGridUpdate, dataGridRevision(revision));
}

function applyDataGridUpdate(update: DataGridRevision): DataGridUpdateResult {
  const target = window as unknown as DataGridWindow;
  const source = structuredClone(target.__unifoldAuthoredDocument);
  source["compositions"] = [];
  source["machines"] = [];
  delete source["semantics"];
  source.revision = update.revision;
  source.view = {
    $comp: "DataGrid",
    caption: "People <script>",
    columns: update.columns,
    id: source.view.id,
    rows: update.rows,
    selectionMode: "multiple",
    sortableColumns: update.sortableColumns,
    value: { selectedRowIds: [] }
  };
  return target.__unifoldUpdateDocument(source);
}

function dataGridRevision(revision: DataGridRevisionName): DataGridRevision {
  const recovered = revision === "recovered";
  return {
    columns: [
      { key: "name", label: "Name" },
      { key: "age", label: "Age" }
    ],
    revision,
    rows: recovered
      ? [{ cells: { age: 55, name: "Linus" }, id: "linus" }]
      : [
          { cells: { age: 41, name: "Grace <img src=x>" }, id: "grace" },
          { cells: { age: 37, name: "Ada" }, id: "ada" }
        ],
    sortableColumns: revision === "invalid" ? ["name", "missing"] : ["name", "age"]
  };
}

type DataGridRevisionName = "initial" | "invalid" | "recovered";

interface DataGridRevision {
  readonly columns: readonly Readonly<Record<string, string>>[];
  readonly revision: DataGridRevisionName;
  readonly rows: readonly Readonly<Record<string, unknown>>[];
  readonly sortableColumns: readonly string[];
}

interface DataGridWindow {
  readonly __unifoldAuthoredDocument: DataGridDocument;
  __unifoldStableDataGrid?: Element;
  readonly __unifoldUpdateDocument: (source: DataGridDocument) => DataGridUpdateResult;
}

interface DataGridDocument extends Record<string, unknown> {
  revision: string;
  view: Record<string, unknown> & { id: string };
}

interface DataGridUpdateResult {
  readonly diagnostics?: readonly unknown[];
  readonly status: UnifoldApplicationUpdateStatus;
}
