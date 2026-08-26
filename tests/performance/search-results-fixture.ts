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
import type { UnifoldSearchResults } from "@unislang/unifold-elements";
import {
  mountUnifoldApplication,
  UnifoldApplicationMountStatus,
  type UnifoldApplicationPort
} from "@unislang/unifold";

import { percentile } from "./profile-statistics.js";

const SEARCH_RESULT_COUNT = 10_000;
export const SEARCH_RESULT_RENDER_LIMIT = 200;
const STARTUP_P95_LIMIT_MILLISECONDS = 1_000;
const QUERY_P95_LIMIT_MILLISECONDS = 100;
const SELECTION_P95_LIMIT_MILLISECONDS = 100;
const PROFILE_SAMPLES = 20;

interface MountedSearchResults {
  readonly application: UnifoldApplicationPort;
  readonly container: HTMLElement;
  readonly element: UnifoldSearchResults;
}

interface InteractionEvidence {
  readonly queryMilliseconds: number;
  readonly renderedOptions: number;
  readonly selectedResultId: string;
  readonly selectionMilliseconds: number;
  readonly valueQuery: string;
}

export async function measureSearchResultsPerformance() {
  disposeSearchResults(await mountSearchResults());
  const startupSamples: number[] = [];
  const querySamples: number[] = [];
  const selectionSamples: number[] = [];
  const interactions: InteractionEvidence[] = [];
  for (let sample = 0; sample < PROFILE_SAMPLES; sample += 1) {
    const started = performance.now();
    const mounted = await mountSearchResults();
    startupSamples.push(performance.now() - started);
    const evidence = await exerciseSearchResults(mounted.element);
    interactions.push(evidence);
    querySamples.push(evidence.queryMilliseconds);
    selectionSamples.push(evidence.selectionMilliseconds);
    disposeSearchResults(mounted);
  }
  return performanceEvidence(startupSamples, querySamples, selectionSamples, interactions);
}

export async function mountSearchResults(): Promise<MountedSearchResults> {
  const container = document.createElement("main");
  document.body.append(container);
  const mounted = requireMounted(
    mountUnifoldApplication(searchResultsDocument(), container),
    container
  );
  const element = requireSearchResults(container);
  await element.updateComplete;
  return { application: mounted.application, container, element };
}

export async function exerciseSearchResults(
  element: UnifoldSearchResults
): Promise<InteractionEvidence> {
  const root = element.shadowRoot;
  if (root === null) throw new Error("The SearchResults shadow root is missing.");
  const input = root.querySelector<HTMLInputElement>('input[type="search"]');
  if (input === null) throw new Error("The SearchResults input is missing.");
  input.value = "Grace";
  const queryStarted = performance.now();
  input.dispatchEvent(new Event("input"));
  await element.updateComplete;
  const queryMilliseconds = performance.now() - queryStarted;
  element.moveActive(1);
  const selectionStarted = performance.now();
  element.selectActive();
  await element.updateComplete;
  return {
    queryMilliseconds,
    renderedOptions: root.querySelectorAll("[role=option]").length,
    selectedResultId: element.value.selectedResultId,
    selectionMilliseconds: performance.now() - selectionStarted,
    valueQuery: element.value.query
  };
}

export function disposeSearchResults(mounted: MountedSearchResults): void {
  mounted.application.dispose();
  mounted.container.remove();
}

function searchResultsDocument(): JsonObject {
  return {
    $schema: UiContractSchemaUri.Version1,
    catalog: { name: CoreCatalogName.UnifoldCore, version: CoreCatalogVersion.Version1 },
    compositions: [],
    id: "search-results-performance",
    jsonUiProfile: {
      name: JsonUiProfileName.Unifold,
      upstream: JsonUiUpstreamRevision.Version01025,
      version: JsonUiProfileVersion.Version1
    },
    revision: "1",
    schemaVersion: UiSchemaVersion.Version1,
    view: searchResultsView()
  };
}

function searchResultsView(): JsonObject {
  return {
    $comp: "SearchResults",
    id: "people-search",
    itemHeight: 64,
    label: "Search people",
    results: searchResults(),
    resultsLabel: "People results",
    value: { query: "Ada", selectedResultId: "result-00000" },
    viewportHeight: 448
  };
}

function searchResults(): readonly JsonObject[] {
  return Array.from({ length: SEARCH_RESULT_COUNT }, (_, index) => ({
    description: index === 1 ? "Pending" : "Active",
    href: `/people/${index}`,
    id: `result-${String(index).padStart(5, "0")}`,
    title: `Person ${index}`
  }));
}

function performanceEvidence(
  startupSamples: readonly number[],
  querySamples: readonly number[],
  selectionSamples: readonly number[],
  interactions: readonly InteractionEvidence[]
) {
  const startup = statistics(startupSamples);
  const queryUpdate = statistics(querySamples);
  const selectionUpdate = statistics(selectionSamples);
  const maximumRenderedOptions = Math.max(
    ...interactions.map(({ renderedOptions }) => renderedOptions)
  );
  const gates = performanceGates(
    startup,
    queryUpdate,
    selectionUpdate,
    maximumRenderedOptions,
    interactions
  );
  return {
    gates,
    maximumRenderedOptions,
    queryUpdate,
    resultCount: SEARCH_RESULT_COUNT,
    sampleCount: PROFILE_SAMPLES,
    selectionUpdate,
    startup
  };
}

function performanceGates(
  startup: ReturnType<typeof statistics>,
  query: ReturnType<typeof statistics>,
  selection: ReturnType<typeof statistics>,
  renderedOptions: number,
  interactions: readonly InteractionEvidence[]
) {
  const bounded = renderedOptions <= SEARCH_RESULT_RENDER_LIMIT;
  const queried = interactions.every(({ valueQuery }) => valueQuery === "Grace");
  const selected = interactions.every(
    ({ selectedResultId }) => selectedResultId === "result-00001"
  );
  return [
    startupGate(startup.p95Milliseconds, renderedOptions, bounded),
    interactionGate(
      "10k-result search query update",
      query.p95Milliseconds,
      QUERY_P95_LIMIT_MILLISECONDS,
      queried
    ),
    interactionGate(
      "10k-result search selection update",
      selection.p95Milliseconds,
      SELECTION_P95_LIMIT_MILLISECONDS,
      selected,
      "result-00001"
    )
  ];
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
    name: "10k-result search startup",
    passed: actualP95Milliseconds <= STARTUP_P95_LIMIT_MILLISECONDS && bounded,
    renderedOptionLimit: SEARCH_RESULT_RENDER_LIMIT
  };
}

function interactionGate(
  name: string,
  actualP95Milliseconds: number,
  limitP95Milliseconds: number,
  exact: boolean,
  requiredSelectedResultId?: string
) {
  const gate = {
    actualP95Milliseconds,
    limitP95Milliseconds,
    name,
    passed: actualP95Milliseconds <= limitP95Milliseconds && exact
  };
  if (requiredSelectedResultId === undefined) return gate;
  return { ...gate, requiredSelectedResultId };
}

function requireMounted(
  mounted: ReturnType<typeof mountUnifoldApplication>,
  container: HTMLElement
) {
  if (mounted.status === UnifoldApplicationMountStatus.Mounted) return mounted;
  container.remove();
  throw new Error(`SearchResults mount failed: ${JSON.stringify(mounted.diagnostics)}`);
}

function requireSearchResults(container: HTMLElement): UnifoldSearchResults {
  const element = container.querySelector<UnifoldSearchResults>("unifold-search-results");
  if (element === null) throw new Error("The mounted SearchResults element is missing.");
  return element;
}
