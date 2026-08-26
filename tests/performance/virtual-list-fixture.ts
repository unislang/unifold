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
import type { UnifoldVirtualList } from "@unislang/unifold-elements";
import { defineUnifoldVirtualList } from "@unislang/unifold-elements/virtual-list";
import {
  mountUnifoldApplication,
  UnifoldApplicationMountStatus,
  type UnifoldApplicationPort
} from "@unislang/unifold";

import { percentile } from "./profile-statistics.js";

export const VIRTUAL_LIST_ITEM_COUNT = 10_000;
export const VIRTUAL_LIST_RENDER_LIMIT = 200;
const VIRTUAL_LIST_P95_LIMIT_MILLISECONDS = 1_000;
const PROFILE_SAMPLES = 20;

interface MountedVirtualList {
  readonly application: UnifoldApplicationPort;
  readonly container: HTMLElement;
  readonly element: UnifoldVirtualList;
}

export async function measureVirtualListStartup() {
  const authored = virtualListDocument();
  await disposeAfterMount(authored);
  const samples: number[] = [];
  let maximumRenderedRows = 0;
  for (let sample = 0; sample < PROFILE_SAMPLES; sample += 1) {
    const started = performance.now();
    const mounted = await mountVirtualList(authored);
    samples.push(performance.now() - started);
    maximumRenderedRows = Math.max(maximumRenderedRows, renderedRows(mounted.element));
    disposeVirtualList(mounted);
  }
  const p95Milliseconds = percentile(samples, 0.95);
  return startupEvidence(samples, p95Milliseconds, maximumRenderedRows);
}

export async function mountVirtualList(
  authored = virtualListDocument()
): Promise<MountedVirtualList> {
  defineUnifoldVirtualList(customElements);
  const container = document.createElement("main");
  document.body.append(container);
  const mounted = requireMounted(mountUnifoldApplication(authored, container), container);
  const element = requireVirtualList(container);
  await element.updateComplete;
  return { application: mounted.application, container, element };
}

function requireMounted(
  mounted: ReturnType<typeof mountUnifoldApplication>,
  container: HTMLElement
) {
  if (mounted.status === UnifoldApplicationMountStatus.Mounted) return mounted;
  container.remove();
  throw new Error(`Virtual-list mount failed: ${JSON.stringify(mounted.diagnostics)}`);
}

function requireVirtualList(container: HTMLElement): UnifoldVirtualList {
  const element = container.querySelector<UnifoldVirtualList>("unifold-virtual-list");
  if (element === null) throw new Error("The mounted virtual-list element is missing.");
  return element;
}

export function disposeVirtualList(mounted: MountedVirtualList): void {
  mounted.application.dispose();
  mounted.container.remove();
}

function virtualListDocument(): JsonObject {
  return {
    $schema: UiContractSchemaUri.Version1,
    catalog: { name: CoreCatalogName.UnifoldCore, version: CoreCatalogVersion.Version1 },
    compositions: [],
    id: "virtual-list-performance",
    jsonUiProfile: {
      name: JsonUiProfileName.Unifold,
      upstream: JsonUiUpstreamRevision.Version01025,
      version: JsonUiProfileVersion.Version1
    },
    revision: "1",
    schemaVersion: UiSchemaVersion.Version1,
    view: virtualListView()
  };
}

function virtualListView(): JsonObject {
  return {
    $comp: "VirtualList",
    id: "records",
    itemHeight: 32,
    label: "Records",
    options: virtualOptions(),
    overscan: 4,
    value: "item-00010",
    viewportHeight: 480
  };
}

function virtualOptions(): readonly JsonObject[] {
  return Array.from({ length: VIRTUAL_LIST_ITEM_COUNT }, (_, index) => ({
    label: `Item ${index}`,
    value: `item-${String(index).padStart(5, "0")}`
  }));
}

async function disposeAfterMount(authored: JsonObject): Promise<void> {
  disposeVirtualList(await mountVirtualList(authored));
}

function startupEvidence(
  samples: readonly number[],
  p95Milliseconds: number,
  maximumRenderedRows: number
) {
  return {
    gate: {
      actualP95Milliseconds: p95Milliseconds,
      actualRenderedRows: maximumRenderedRows,
      limitP95Milliseconds: VIRTUAL_LIST_P95_LIMIT_MILLISECONDS,
      name: "10k-row virtual-list startup",
      passed:
        p95Milliseconds <= VIRTUAL_LIST_P95_LIMIT_MILLISECONDS &&
        maximumRenderedRows <= VIRTUAL_LIST_RENDER_LIMIT,
      renderedRowLimit: VIRTUAL_LIST_RENDER_LIMIT
    },
    maximumMilliseconds: Math.max(...samples),
    maximumRenderedRows,
    p50Milliseconds: percentile(samples, 0.5),
    p95Milliseconds,
    p99Milliseconds: percentile(samples, 0.99),
    renderedRowLimit: VIRTUAL_LIST_RENDER_LIMIT,
    sampleCount: samples.length
  };
}

function renderedRows(element: UnifoldVirtualList): number {
  return element.shadowRoot?.querySelectorAll("[role=option]").length ?? 0;
}
