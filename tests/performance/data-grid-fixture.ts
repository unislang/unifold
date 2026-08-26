import {
  CoreCatalogName,
  CoreCatalogVersion,
  JsonUiProfileName,
  JsonUiProfileVersion,
  JsonUiUpstreamRevision,
  UiContractSchemaUri,
  UiSchemaVersion,
  type JsonObject
} from "@unislang/unifold-contracts";
import type { UnifoldDataGrid } from "@unislang/unifold-elements";
import { defineUnifoldDataGrid } from "@unislang/unifold-elements/data-grid";
import {
  mountUnifoldApplication,
  UnifoldApplicationMountStatus,
  type UnifoldApplicationPort
} from "@unislang/unifold";

import { percentile } from "./profile-statistics.js";

export const DATA_GRID_ROW_COUNT = 1_000;
const STARTUP_P95_LIMIT_MILLISECONDS = 1_000;
const SORT_P95_LIMIT_MILLISECONDS = 250;
const SELECTION_P95_LIMIT_MILLISECONDS = 100;
const PROFILE_SAMPLES = 20;

interface MountedDataGrid {
  readonly application: UnifoldApplicationPort;
  readonly container: HTMLElement;
  readonly element: UnifoldDataGrid;
}

interface InteractionEvidence {
  readonly renderedRows: number;
  readonly selected: boolean;
  readonly selectionMilliseconds: number;
  readonly sortMilliseconds: number;
  readonly sortedFirstRowId: string;
}

export async function measureDataGridPerformance() {
  disposeDataGrid(await mountDataGrid());
  const startup: number[] = [];
  const sort: number[] = [];
  const selection: number[] = [];
  const interactions: InteractionEvidence[] = [];
  for (let sample = 0; sample < PROFILE_SAMPLES; sample += 1) {
    const started = performance.now();
    const mounted = await mountDataGrid();
    startup.push(performance.now() - started);
    const evidence = await exerciseDataGrid(mounted.element);
    interactions.push(evidence);
    sort.push(evidence.sortMilliseconds);
    selection.push(evidence.selectionMilliseconds);
    disposeDataGrid(mounted);
  }
  return performanceEvidence(startup, sort, selection, interactions);
}

export async function mountDataGrid(): Promise<MountedDataGrid> {
  defineUnifoldDataGrid(customElements);
  const container = document.createElement("main");
  document.body.append(container);
  const mounted = requireMounted(mountUnifoldApplication(dataGridDocument(), container), container);
  const element = requireDataGrid(container);
  await element.updateComplete;
  return { application: mounted.application, container, element };
}

export async function exerciseDataGrid(element: UnifoldDataGrid): Promise<InteractionEvidence> {
  const root = element.shadowRoot;
  if (root === null) throw new Error("The DataGrid shadow root is missing.");
  const sortButton = requireElement<HTMLButtonElement>(root, "button");
  const sortStarted = performance.now();
  sortButton.click();
  await element.updateComplete;
  const sortMilliseconds = performance.now() - sortStarted;
  const selectionInput = requireElement<HTMLInputElement>(root, "tbody input");
  const selectionStarted = performance.now();
  selectionInput.click();
  await element.updateComplete;
  return {
    renderedRows: root.querySelectorAll("tbody tr").length,
    selected: element.value.selectedRowIds.includes("person-0"),
    selectionMilliseconds: performance.now() - selectionStarted,
    sortMilliseconds,
    sortedFirstRowId: firstRowId(root)
  };
}

export function disposeDataGrid(mounted: MountedDataGrid): void {
  mounted.application.dispose();
  mounted.container.remove();
}

function dataGridDocument(): JsonObject {
  return {
    $schema: UiContractSchemaUri.Version1,
    catalog: { name: CoreCatalogName.UnifoldCore, version: CoreCatalogVersion.Version1 },
    compositions: [],
    id: "data-grid-performance",
    jsonUiProfile: {
      name: JsonUiProfileName.Unifold,
      upstream: JsonUiUpstreamRevision.Version01025,
      version: JsonUiProfileVersion.Version1
    },
    revision: "1",
    schemaVersion: UiSchemaVersion.Version1,
    view: dataGridView()
  };
}

function dataGridView(): JsonObject {
  return {
    $comp: "DataGrid",
    caption: "Performance records",
    columns: [
      { key: "name", label: "Name" },
      { key: "score", label: "Score" }
    ],
    id: "records",
    rows: dataGridRows(),
    selectionMode: "multiple",
    sortableColumns: ["name", "score"],
    value: { selectedRowIds: [] }
  };
}

function dataGridRows(): readonly JsonObject[] {
  return Array.from({ length: DATA_GRID_ROW_COUNT }, (_, offset) => {
    const index = DATA_GRID_ROW_COUNT - offset - 1;
    return {
      cells: { name: `Person ${String(index).padStart(4, "0")}`, score: index },
      id: `person-${index}`
    };
  });
}

function performanceEvidence(
  startupSamples: readonly number[],
  sortSamples: readonly number[],
  selectionSamples: readonly number[],
  interactions: readonly InteractionEvidence[]
) {
  const startup = statistics(startupSamples);
  const sortUpdate = statistics(sortSamples);
  const selectionUpdate = statistics(selectionSamples);
  const exactRows = interactions.every(({ renderedRows }) => renderedRows === DATA_GRID_ROW_COUNT);
  const sorted = interactions.every(({ sortedFirstRowId }) => sortedFirstRowId === "person-0");
  const selected = interactions.every((sample) => sample.selected);
  return {
    gates: [
      startupGate(startup.p95Milliseconds, exactRows),
      sortGate(sortUpdate.p95Milliseconds, sorted),
      selectionGate(selectionUpdate.p95Milliseconds, selected)
    ],
    renderedRows: DATA_GRID_ROW_COUNT,
    sampleCount: PROFILE_SAMPLES,
    selectionUpdate,
    sortUpdate,
    startup
  };
}

function statistics(samples: readonly number[]) {
  return {
    maximumMilliseconds: Math.max(...samples),
    p50Milliseconds: percentile(samples, 0.5),
    p95Milliseconds: percentile(samples, 0.95),
    p99Milliseconds: percentile(samples, 0.99)
  };
}

function startupGate(actualP95Milliseconds: number, exactRows: boolean) {
  return {
    actualP95Milliseconds,
    actualRenderedRows: DATA_GRID_ROW_COUNT,
    limitP95Milliseconds: STARTUP_P95_LIMIT_MILLISECONDS,
    name: "1k-row native-data-grid startup",
    passed: actualP95Milliseconds <= STARTUP_P95_LIMIT_MILLISECONDS && exactRows,
    requiredRenderedRows: DATA_GRID_ROW_COUNT
  };
}

function sortGate(actualP95Milliseconds: number, sorted: boolean) {
  return {
    actualP95Milliseconds,
    limitP95Milliseconds: SORT_P95_LIMIT_MILLISECONDS,
    name: "1k-row native-data-grid sort update",
    passed: actualP95Milliseconds <= SORT_P95_LIMIT_MILLISECONDS && sorted,
    requiredFirstRowId: "person-0"
  };
}

function selectionGate(actualP95Milliseconds: number, selected: boolean) {
  return {
    actualP95Milliseconds,
    limitP95Milliseconds: SELECTION_P95_LIMIT_MILLISECONDS,
    name: "1k-row native-data-grid selection update",
    passed: actualP95Milliseconds <= SELECTION_P95_LIMIT_MILLISECONDS && selected,
    requiredSelectedRowId: "person-0"
  };
}

function requireMounted(
  mounted: ReturnType<typeof mountUnifoldApplication>,
  container: HTMLElement
) {
  if (mounted.status === UnifoldApplicationMountStatus.Mounted) return mounted;
  container.remove();
  throw new Error(`DataGrid mount failed: ${JSON.stringify(mounted.diagnostics)}`);
}

function requireDataGrid(container: HTMLElement): UnifoldDataGrid {
  const element = container.querySelector<UnifoldDataGrid>("unifold-data-grid");
  if (element === null) throw new Error("The mounted DataGrid element is missing.");
  return element;
}

function requireElement<T extends Element>(root: ShadowRoot, selector: string): T {
  const element = root.querySelector<T>(selector);
  if (element === null) throw new Error(`The DataGrid ${selector} is missing.`);
  return element;
}

function firstRowId(root: ShadowRoot): string {
  const row = root.querySelector("tbody tr");
  if (row === null) return "";
  return row.getAttribute("data-row-id") ?? "";
}
