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
import type { UnifoldTable } from "@unislang/unifold-elements";
import {
  mountUnifoldApplication,
  UnifoldApplicationMountStatus,
  type UnifoldApplicationPort
} from "@unislang/unifold";

import { percentile } from "./profile-statistics.js";

export const TABLE_ROW_COUNT = 1_000;
const TABLE_P95_LIMIT_MILLISECONDS = 1_000;
const PROFILE_SAMPLES = 20;

interface MountedTable {
  readonly application: UnifoldApplicationPort;
  readonly container: HTMLElement;
  readonly element: UnifoldTable;
}

export async function measureTableStartup() {
  const authored = tableDocument();
  disposeTable(await mountTable(authored));
  const samples: number[] = [];
  const rowCounts: number[] = [];
  for (let sample = 0; sample < PROFILE_SAMPLES; sample += 1) {
    const started = performance.now();
    const mounted = await mountTable(authored);
    samples.push(performance.now() - started);
    rowCounts.push(renderedRows(mounted.element));
    disposeTable(mounted);
  }
  return startupEvidence(samples, rowCounts);
}

export async function mountTable(authored = tableDocument()): Promise<MountedTable> {
  const container = document.createElement("main");
  document.body.append(container);
  const mounted = requireMounted(mountUnifoldApplication(authored, container), container);
  const element = requireTable(container);
  await element.updateComplete;
  return { application: mounted.application, container, element };
}

function requireMounted(
  mounted: ReturnType<typeof mountUnifoldApplication>,
  container: HTMLElement
) {
  if (mounted.status === UnifoldApplicationMountStatus.Mounted) return mounted;
  container.remove();
  throw new Error(`Table mount failed: ${JSON.stringify(mounted.diagnostics)}`);
}

function requireTable(container: HTMLElement): UnifoldTable {
  const element = container.querySelector<UnifoldTable>("unifold-table");
  if (element === null) throw new Error("The mounted table element is missing.");
  return element;
}

export function disposeTable(mounted: MountedTable): void {
  mounted.application.dispose();
  mounted.container.remove();
}

function tableDocument(): JsonObject {
  return {
    $schema: UiContractSchemaUri.Version1,
    catalog: { name: CoreCatalogName.UnifoldCore, version: CoreCatalogVersion.Version1 },
    compositions: [],
    id: "table-performance",
    jsonUiProfile: {
      name: JsonUiProfileName.Unifold,
      upstream: JsonUiUpstreamRevision.Version01025,
      version: JsonUiProfileVersion.Version1
    },
    revision: "1",
    schemaVersion: UiSchemaVersion.Version1,
    view: tableView()
  };
}

function tableView(): JsonObject {
  return {
    $comp: "Table",
    caption: "Performance records",
    columns: [
      { key: "name", label: "Name" },
      { key: "active", label: "Active" }
    ],
    id: "records",
    rows: Array.from({ length: TABLE_ROW_COUNT }, (_, index) => ({
      cells: { active: index % 2 === 0, name: `Person ${index}` },
      id: `person-${index}`
    }))
  };
}

function startupEvidence(samples: readonly number[], rowCounts: readonly number[]) {
  const p95Milliseconds = percentile(samples, 0.95);
  const minimumRenderedRows = Math.min(...rowCounts);
  const maximumRenderedRows = Math.max(...rowCounts);
  return {
    gate: {
      actualP95Milliseconds: p95Milliseconds,
      actualRenderedRows: maximumRenderedRows,
      limitP95Milliseconds: TABLE_P95_LIMIT_MILLISECONDS,
      name: "1k-row native-table startup",
      passed:
        p95Milliseconds <= TABLE_P95_LIMIT_MILLISECONDS &&
        minimumRenderedRows === TABLE_ROW_COUNT &&
        maximumRenderedRows === TABLE_ROW_COUNT,
      requiredRenderedRows: TABLE_ROW_COUNT
    },
    maximumMilliseconds: Math.max(...samples),
    maximumRenderedRows,
    minimumRenderedRows,
    p50Milliseconds: percentile(samples, 0.5),
    p95Milliseconds,
    p99Milliseconds: percentile(samples, 0.99),
    sampleCount: samples.length
  };
}

function renderedRows(element: UnifoldTable): number {
  return element.shadowRoot?.querySelectorAll("tbody tr").length ?? 0;
}
