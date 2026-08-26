import { UnifoldApplicationUpdateStatus } from "@unislang/unifold";
import { ElementEventType } from "@unislang/unifold-elements";
import { expect, test, type UnifoldHarness } from "@unislang/unifold-playwright";

type CapturedEvent = Awaited<ReturnType<UnifoldHarness["events"]>>[number];

test("queries and selects a virtualized search-results collection", async ({ page, unifold }) => {
  await page.goto("/");
  const initial = await reviseSearchResults(page, "initial");
  expect(initial.status, JSON.stringify(initial.diagnostics)).toBe(
    UnifoldApplicationUpdateStatus.Applied
  );
  const search = page.locator("#app unifold-search-results");
  const input = search.getByRole("searchbox", { name: "Search people <script>" });
  const listbox = search.getByRole("listbox", { name: "People results" });
  await assertInitialSearch(search, input, listbox);
  await rememberSearchResults(search);

  await input.fill("Grace <img>");
  await listbox.focus();
  await listbox.press("ArrowDown");
  await listbox.press("Enter");
  await expect(search.getByRole("option").nth(1)).toHaveAttribute("aria-selected", "true");
  await expect(listbox).toBeFocused();
  await expect
    .poll(async () => latestSearchValue(await unifold.events()))
    .toEqual({
      query: "Grace <img>",
      selectedResultId: "result-00001"
    });
  await unifold.assertAccessibility();

  await assertRejectedRevision(page, search, listbox);
  await assertRecoveredRevision(page, search, listbox, unifold);
});

async function assertInitialSearch(
  search: import("@playwright/test").Locator,
  input: import("@playwright/test").Locator,
  listbox: import("@playwright/test").Locator
): Promise<void> {
  await expect(search).toHaveCount(1);
  await expect(input).toHaveValue("Ada");
  expect(await search.getByRole("option").count()).toBeLessThanOrEqual(200);
  await expect(search.getByRole("option").first()).toHaveAttribute("aria-setsize", "10000");
  await expect(search.getByRole("status")).toHaveText("10000 results");
  await expect(listbox).toHaveAttribute("aria-busy", "false");
  await expect(search).toContainText('Pending <img src=x onerror="alert(1)">');
  expect(await search.locator("img").count()).toBe(0);
}

async function assertRejectedRevision(
  page: import("@playwright/test").Page,
  search: import("@playwright/test").Locator,
  listbox: import("@playwright/test").Locator
): Promise<void> {
  const rejected = await reviseSearchResults(page, "invalid");
  expect(rejected.status).toBe(UnifoldApplicationUpdateStatus.Rejected);
  await expect(search.getByRole("option").first()).toContainText("Person 0");
  expect(await retainedSearchResults(search)).toBe(true);
  await expect(listbox).toBeFocused();
}

async function assertRecoveredRevision(
  page: import("@playwright/test").Page,
  search: import("@playwright/test").Locator,
  listbox: import("@playwright/test").Locator,
  unifold: UnifoldHarness
): Promise<void> {
  expect((await reviseSearchResults(page, "recovered")).status).toBe(
    UnifoldApplicationUpdateStatus.Applied
  );
  await expect(search.getByRole("option").first()).toContainText("Updated person 0");
  await expect(search.getByRole("option").nth(1)).toHaveAttribute("aria-selected", "true");
  expect(await retainedSearchResults(search)).toBe(true);
  await expect(listbox).toBeFocused();
  await unifold.assertAccessibility();
}

function latestSearchValue(events: readonly CapturedEvent[]): unknown {
  const event = [...events].reverse().find(isSearchInput);
  const change = event?.data.change;
  if (Object.prototype.toString.call(change) !== "[object Object]") return undefined;
  return (change as Readonly<Record<string, unknown>>)["value"];
}

function isSearchInput(event: CapturedEvent): boolean {
  return (
    event.type === ElementEventType.ControlInput && event.data.sourceNode?.type === "SearchResults"
  );
}

async function rememberSearchResults(search: import("@playwright/test").Locator): Promise<void> {
  await search.evaluate((element) => {
    (window as unknown as SearchResultsWindow).__unifoldStableSearchResults = element;
  });
}

async function retainedSearchResults(search: import("@playwright/test").Locator): Promise<boolean> {
  return search.evaluate(
    (element) => (window as unknown as SearchResultsWindow).__unifoldStableSearchResults === element
  );
}

async function reviseSearchResults(
  page: import("@playwright/test").Page,
  revision: SearchResultsRevisionName
): Promise<SearchResultsUpdateResult> {
  return page.evaluate(applySearchResultsUpdate, searchResultsRevision(revision));
}

function applySearchResultsUpdate(update: SearchResultsRevision): SearchResultsUpdateResult {
  const target = window as unknown as SearchResultsWindow;
  const source = structuredClone(target.__unifoldAuthoredDocument);
  source["compositions"] = [];
  source["machines"] = [];
  delete source["semantics"];
  source.revision = update.revision;
  source.view = {
    $comp: "SearchResults",
    id: source.view.id,
    itemHeight: 64,
    label: "Search people <script>",
    results: update.results,
    resultsLabel: "People results",
    value: { query: update.query, selectedResultId: update.selectedResultId },
    viewportHeight: 384
  };
  return target.__unifoldUpdateDocument(source);
}

function searchResultsRevision(revision: SearchResultsRevisionName): SearchResultsRevision {
  const recovered = revision === "recovered";
  const results = Array.from({ length: 10_000 }, (_, index) => searchResult(index, recovered));
  invalidateResults(results, revision);
  return {
    query: recovered ? "Grace <img>" : "Ada",
    results,
    revision,
    selectedResultId: recovered ? "result-00001" : "result-00000"
  };
}

function searchResult(index: number, recovered: boolean): Record<string, string> {
  return {
    description: index === 1 ? 'Pending <img src=x onerror="alert(1)">' : `Active result ${index}`,
    href: `/people/${index}`,
    id: `result-${String(index).padStart(5, "0")}`,
    title: `${recovered ? "Updated person" : "Person"} ${index}`
  };
}

function invalidateResults(
  results: Record<string, string>[],
  revision: SearchResultsRevisionName
): void {
  if (revision !== "invalid") return;
  const duplicate = results[1];
  if (duplicate !== undefined) duplicate["id"] = "result-00000";
}

type SearchResultsRevisionName = "initial" | "invalid" | "recovered";

interface SearchResultsRevision {
  readonly query: string;
  readonly results: Readonly<Record<string, string>>[];
  readonly revision: SearchResultsRevisionName;
  readonly selectedResultId: string;
}

interface SearchResultsWindow {
  readonly __unifoldAuthoredDocument: SearchResultsDocument;
  __unifoldStableSearchResults?: Element;
  readonly __unifoldUpdateDocument: (source: SearchResultsDocument) => SearchResultsUpdateResult;
}

interface SearchResultsDocument extends Record<string, unknown> {
  revision: string;
  view: Record<string, unknown> & { id: string };
}

interface SearchResultsUpdateResult {
  readonly diagnostics?: readonly unknown[];
  readonly status: UnifoldApplicationUpdateStatus;
}
