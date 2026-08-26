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
import type { UnifoldCombobox } from "@unislang/unifold-elements";
import {
  mountUnifoldApplication,
  UnifoldApplicationMountStatus,
  type UnifoldApplicationPort
} from "@unislang/unifold";

import { percentile } from "./profile-statistics.js";

export const COMBOBOX_OPTION_COUNT = 10_000;
export const COMBOBOX_RENDER_LIMIT = 200;
const FILTER_P95_LIMIT_MILLISECONDS = 100;
const PROFILE_SAMPLES = 20;

interface MountedCombobox {
  readonly application: UnifoldApplicationPort;
  readonly container: HTMLElement;
  readonly element: UnifoldCombobox;
}

export async function measureComboboxFilter() {
  const mounted = await mountCombobox();
  try {
    await filterCombobox(mounted.element, "Record");
    await filterCombobox(mounted.element, "Record ");
    return await measureFilters(mounted.element);
  } finally {
    disposeCombobox(mounted);
  }
}

export async function mountCombobox(): Promise<MountedCombobox> {
  const container = document.createElement("main");
  document.body.append(container);
  const mounted = mountUnifoldApplication(comboboxDocument(), container);
  if (mounted.status !== UnifoldApplicationMountStatus.Mounted) {
    container.remove();
    throw new Error(`Combobox mount failed: ${JSON.stringify(mounted.diagnostics)}`);
  }
  const element = container.querySelector<UnifoldCombobox>("unifold-combobox");
  if (element === null) throw new Error("The mounted combobox element is missing.");
  await element.updateComplete;
  return { application: mounted.application, container, element };
}

export function disposeCombobox(mounted: MountedCombobox): void {
  mounted.application.dispose();
  mounted.container.remove();
}

export async function filterCombobox(element: UnifoldCombobox, query: string): Promise<void> {
  const input = requireInput(element);
  input.value = query;
  input.dispatchEvent(new InputEvent("input", { bubbles: true }));
  await element.updateComplete;
}

export function renderedComboboxOptions(element: UnifoldCombobox): number {
  return element.shadowRoot?.querySelectorAll("[role=option]").length ?? 0;
}

function comboboxDocument(): JsonObject {
  return {
    $schema: UiContractSchemaUri.Version1,
    catalog: { name: CoreCatalogName.UnifoldCore, version: CoreCatalogVersion.Version1 },
    compositions: [],
    id: "combobox-performance",
    jsonUiProfile: {
      name: JsonUiProfileName.Unifold,
      upstream: JsonUiUpstreamRevision.Version01025,
      version: JsonUiProfileVersion.Version1
    },
    revision: "1",
    schemaVersion: UiSchemaVersion.Version1,
    view: {
      $comp: "Combobox",
      id: "records",
      label: "Records",
      options: comboboxOptions(),
      value: "item-00010"
    }
  };
}

function comboboxOptions(): readonly JsonObject[] {
  return Array.from({ length: COMBOBOX_OPTION_COUNT }, (_, index) => ({
    label: `Record ${String(index).padStart(5, "0")}`,
    value: `item-${String(index).padStart(5, "0")}`
  }));
}

async function measureFilters(element: UnifoldCombobox) {
  const samples: number[] = [];
  let maximumRenderedOptions = 0;
  for (let sample = 0; sample < PROFILE_SAMPLES; sample += 1) {
    const started = performance.now();
    await filterCombobox(element, sample % 2 === 0 ? "Record" : "Record ");
    samples.push(performance.now() - started);
    maximumRenderedOptions = Math.max(maximumRenderedOptions, renderedComboboxOptions(element));
  }
  return filterEvidence(samples, maximumRenderedOptions);
}

function filterEvidence(samples: readonly number[], maximumRenderedOptions: number) {
  const p95Milliseconds = percentile(samples, 0.95);
  return {
    gate: {
      actualOptionCount: COMBOBOX_OPTION_COUNT,
      actualP95Milliseconds: p95Milliseconds,
      actualRenderedOptions: maximumRenderedOptions,
      limitP95Milliseconds: FILTER_P95_LIMIT_MILLISECONDS,
      name: "10k-option combobox filter",
      passed:
        p95Milliseconds <= FILTER_P95_LIMIT_MILLISECONDS &&
        maximumRenderedOptions <= COMBOBOX_RENDER_LIMIT,
      renderedOptionLimit: COMBOBOX_RENDER_LIMIT
    },
    maximumMilliseconds: Math.max(...samples),
    maximumRenderedOptions,
    optionCount: COMBOBOX_OPTION_COUNT,
    p50Milliseconds: percentile(samples, 0.5),
    p95Milliseconds,
    p99Milliseconds: percentile(samples, 0.99),
    renderedOptionLimit: COMBOBOX_RENDER_LIMIT,
    sampleCount: samples.length
  };
}

function requireInput(element: UnifoldCombobox): HTMLInputElement {
  const input = element.shadowRoot?.querySelector("input");
  if (!(input instanceof HTMLInputElement)) throw new Error("Combobox input is missing.");
  return input;
}
