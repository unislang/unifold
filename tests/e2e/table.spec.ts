import { UnifoldApplicationUpdateStatus } from "@unislang/unifold";
import { expect, test } from "@unislang/unifold-playwright";

test("renders and safely revises a native JSON table", async ({ page, unifold }) => {
  await page.goto("/");
  expect((await reviseTable(page, "initial")).status).toBe(UnifoldApplicationUpdateStatus.Applied);

  const table = page.locator("#app unifold-table");
  await expect(table).toHaveCount(1);
  await expect(table.locator("table")).toHaveAccessibleName("People <script>");
  await expect(table.getByRole("columnheader")).toHaveText(["Name", "Active"]);
  await expect(table.getByRole("rowheader")).toHaveText(["Ada", "<img src=x>"]);
  await expect(table.locator("img")).toHaveCount(0);
  await unifold.assertAccessibility();
  await rememberTable(table);

  const rejected = await reviseTable(page, "invalid");
  expect(rejected.status).toBe(UnifoldApplicationUpdateStatus.Rejected);
  await expect(table.getByRole("rowheader")).toHaveText(["Ada", "<img src=x>"]);
  expect(await retainedTable(table)).toBe(true);

  const recovered = await reviseTable(page, "recovered");
  expect(recovered.status).toBe(UnifoldApplicationUpdateStatus.Applied);
  await expect(table.getByRole("rowheader")).toHaveText(["Grace"]);
  expect(await retainedTable(table)).toBe(true);
  await unifold.assertAccessibility();
});

async function rememberTable(table: import("@playwright/test").Locator): Promise<void> {
  await table.evaluate((element) => {
    (window as unknown as TableWindow).__unifoldStableTable = element;
  });
}

async function retainedTable(table: import("@playwright/test").Locator): Promise<boolean> {
  return table.evaluate((element) => {
    return (window as unknown as TableWindow).__unifoldStableTable === element;
  });
}

function applyTableUpdate(update: TableRevision): TableUpdateResult {
  const target = window as unknown as TableWindow;
  const source = structuredClone(target.__unifoldAuthoredDocument);
  source["compositions"] = [];
  source["machines"] = [];
  delete source["semantics"];
  source.revision = update.revision;
  source.view = {
    $comp: "Table",
    caption: "People <script>",
    columns: update.columns,
    id: source.view.id,
    rows: update.rows
  };
  return target.__unifoldUpdateDocument(source);
}

async function reviseTable(
  page: import("@playwright/test").Page,
  revision: TableRevisionName
): Promise<TableUpdateResult> {
  return page.evaluate(applyTableUpdate, tableRevision(revision));
}

function tableRevision(revision: TableRevisionName): TableRevision {
  const columns =
    revision === "invalid"
      ? [
          { key: "name", label: "Name" },
          { key: "name", label: "Duplicate" }
        ]
      : [
          { key: "name", label: "Name" },
          { key: "active", label: "Active" }
        ];
  const rows =
    revision === "recovered"
      ? [{ cells: { active: true, name: "Grace" }, id: "grace" }]
      : [
          { cells: { active: true, name: "Ada" }, id: "ada" },
          { cells: { active: false, name: "<img src=x>" }, id: "grace" }
        ];
  return { columns, revision, rows };
}

type TableRevisionName = "initial" | "invalid" | "recovered";

interface TableRevision {
  readonly columns: readonly Readonly<Record<string, string>>[];
  readonly revision: TableRevisionName;
  readonly rows: readonly Readonly<Record<string, unknown>>[];
}

interface TableWindow {
  readonly __unifoldAuthoredDocument: TableDocument;
  __unifoldStableTable?: Element;
  readonly __unifoldUpdateDocument: (source: TableDocument) => TableUpdateResult;
}

interface TableDocument extends Record<string, unknown> {
  revision: string;
  view: Record<string, unknown> & { id: string };
}

interface TableUpdateResult {
  readonly diagnostics?: readonly unknown[];
  readonly status: UnifoldApplicationUpdateStatus;
}
