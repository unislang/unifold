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
import type { UnifoldMasterDetail } from "@unislang/unifold-elements";
import { defineUnifoldMasterDetail } from "@unislang/unifold-elements/master-detail";
import {
  mountUnifoldApplication,
  UnifoldApplicationMountStatus,
  type UnifoldApplicationPort
} from "@unislang/unifold";

import { percentile } from "./profile-statistics.js";

const MASTER_DETAIL_ROW_COUNT = 10_000;
export const MASTER_DETAIL_RENDER_LIMIT = 200;
const STARTUP_P95_LIMIT_MILLISECONDS = 1_000;
const SELECTION_P95_LIMIT_MILLISECONDS = 100;
const PROFILE_SAMPLES = 20;

interface MountedMasterDetail {
  readonly application: UnifoldApplicationPort;
  readonly container: HTMLElement;
  readonly element: UnifoldMasterDetail;
}

interface InteractionEvidence {
  readonly detailText: string;
  readonly renderedOptions: number;
  readonly selectedValue: string;
  readonly selectionMilliseconds: number;
}

export async function measureMasterDetailPerformance() {
  disposeMasterDetail(await mountMasterDetail());
  const startupSamples: number[] = [];
  const selectionSamples: number[] = [];
  const interactions: InteractionEvidence[] = [];
  for (let sample = 0; sample < PROFILE_SAMPLES; sample += 1) {
    const started = performance.now();
    const mounted = await mountMasterDetail();
    startupSamples.push(performance.now() - started);
    const evidence = await exerciseMasterDetail(mounted.element);
    interactions.push(evidence);
    selectionSamples.push(evidence.selectionMilliseconds);
    disposeMasterDetail(mounted);
  }
  return performanceEvidence(startupSamples, selectionSamples, interactions);
}

export async function mountMasterDetail(): Promise<MountedMasterDetail> {
  defineUnifoldMasterDetail(customElements);
  const container = document.createElement("main");
  document.body.append(container);
  const mounted = requireMounted(
    mountUnifoldApplication(masterDetailDocument(), container),
    container
  );
  const element = requireMasterDetail(container);
  await element.updateComplete;
  return { application: mounted.application, container, element };
}

export async function exerciseMasterDetail(
  element: UnifoldMasterDetail
): Promise<InteractionEvidence> {
  const root = element.shadowRoot;
  if (root === null) throw new Error("The MasterDetail shadow root is missing.");
  element.moveActive(1);
  const started = performance.now();
  element.selectActive();
  await element.updateComplete;
  return {
    detailText: readDetailText(root),
    renderedOptions: root.querySelectorAll("[role=option]").length,
    selectedValue: element.value,
    selectionMilliseconds: performance.now() - started
  };
}

function readDetailText(root: ShadowRoot): string {
  const detail = root.querySelector("[part=detail]");
  if (detail === null) return "";
  return String(detail.textContent);
}

export function disposeMasterDetail(mounted: MountedMasterDetail): void {
  mounted.application.dispose();
  mounted.container.remove();
}

function masterDetailDocument(): JsonObject {
  return {
    $schema: UiContractSchemaUri.Version1,
    catalog: { name: CoreCatalogName.UnifoldCore, version: CoreCatalogVersion.Version1 },
    compositions: [],
    id: "master-detail-performance",
    jsonUiProfile: {
      name: JsonUiProfileName.Unifold,
      upstream: JsonUiUpstreamRevision.Version01025,
      version: JsonUiProfileVersion.Version1
    },
    revision: "1",
    schemaVersion: UiSchemaVersion.Version1,
    view: masterDetailView()
  };
}

function masterDetailView(): JsonObject {
  return {
    $comp: "MasterDetail",
    columns: [
      { key: "name", label: "Name" },
      { key: "status", label: "Status" }
    ],
    detailLabel: "Account details",
    id: "accounts",
    itemHeight: 32,
    label: "Accounts",
    masterColumn: "name",
    rows: masterDetailRows(),
    value: "account-00000",
    viewportHeight: 480
  };
}

function masterDetailRows(): readonly JsonObject[] {
  return Array.from({ length: MASTER_DETAIL_ROW_COUNT }, (_, index) => ({
    cells: { name: `Account ${index}`, status: index === 1 ? "Pending" : "Active" },
    id: `account-${String(index).padStart(5, "0")}`
  }));
}

function performanceEvidence(
  startupSamples: readonly number[],
  selectionSamples: readonly number[],
  interactions: readonly InteractionEvidence[]
) {
  const startup = statistics(startupSamples);
  const selectionUpdate = statistics(selectionSamples);
  const bounded = interactions.every(
    ({ renderedOptions }) => renderedOptions <= MASTER_DETAIL_RENDER_LIMIT
  );
  const maximumRenderedOptions = Math.max(
    ...interactions.map(({ renderedOptions }) => renderedOptions)
  );
  const selected = interactions.every(
    ({ detailText, selectedValue }) =>
      selectedValue === "account-00001" && detailText.includes("Pending")
  );
  return {
    gates: [
      startupGate(startup.p95Milliseconds, maximumRenderedOptions, bounded),
      selectionGate(selectionUpdate.p95Milliseconds, selected)
    ],
    maximumRenderedOptions,
    rowCount: MASTER_DETAIL_ROW_COUNT,
    sampleCount: PROFILE_SAMPLES,
    selectionUpdate,
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

function startupGate(
  actualP95Milliseconds: number,
  actualRenderedOptions: number,
  bounded: boolean
) {
  return {
    actualP95Milliseconds,
    actualRenderedOptions,
    limitP95Milliseconds: STARTUP_P95_LIMIT_MILLISECONDS,
    name: "10k-row master-detail startup",
    passed: actualP95Milliseconds <= STARTUP_P95_LIMIT_MILLISECONDS && bounded,
    renderedOptionLimit: MASTER_DETAIL_RENDER_LIMIT
  };
}

function selectionGate(actualP95Milliseconds: number, selected: boolean) {
  return {
    actualP95Milliseconds,
    limitP95Milliseconds: SELECTION_P95_LIMIT_MILLISECONDS,
    name: "10k-row master-detail selection update",
    passed: actualP95Milliseconds <= SELECTION_P95_LIMIT_MILLISECONDS && selected,
    requiredSelectedRowId: "account-00001"
  };
}

function requireMounted(
  mounted: ReturnType<typeof mountUnifoldApplication>,
  container: HTMLElement
) {
  if (mounted.status === UnifoldApplicationMountStatus.Mounted) return mounted;
  container.remove();
  throw new Error(`MasterDetail mount failed: ${JSON.stringify(mounted.diagnostics)}`);
}

function requireMasterDetail(container: HTMLElement): UnifoldMasterDetail {
  const element = container.querySelector<UnifoldMasterDetail>("unifold-master-detail");
  if (element === null) throw new Error("The mounted MasterDetail element is missing.");
  return element;
}
