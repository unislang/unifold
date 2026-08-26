import type { Page } from "@playwright/test";
import { ElementEventType } from "@unislang/unifold-elements";
import { UiEventType } from "@unislang/unifold-events";
import { expect, test } from "@unislang/unifold-playwright";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const SCALE_NODE_COUNTS = [1_000, 10_000] as const;
const TARGET_ID = "scale-target";
const PERFORMANCE_RESULTS = fileURLToPath(new URL("../../benchmark-results", import.meta.url));

test.setTimeout(180_000);

for (const nodeCount of SCALE_NODE_COUNTS) {
  test(`selectively updates exactly one of ${nodeCount} rendered nodes`, async ({
    browserName,
    page,
    unifold
  }) => {
    test.skip(browserName !== "chromium", "The pinned scale proof runs once in Chromium.");
    await page.goto("/");
    expect(await unifold.events()).toEqual([]);
    await installScaleDocument(page, nodeCount);
    await captureScaleBaseline(page);
    await page.getByLabel("Scale target").fill("changed");
    const observation = await readScaleObservation(page);
    assertScaleObservation(observation, nodeCount);
  });
}

test("records input-to-next-frame latency at 1k and 10k nodes", async ({
  browserName,
  page
}, testInfo) => {
  test.skip(browserName !== "chromium", "The pinned latency proof runs once in Chromium.");
  const results: Record<string, LatencySummary> = {};
  for (const nodeCount of SCALE_NODE_COUNTS) {
    await page.goto("/");
    await installScaleDocument(page, nodeCount);
    results[String(nodeCount)] = await measureLatencySamples(page);
  }
  const report = `${JSON.stringify({ results, schemaVersion: "1.0.0" }, null, 2)}\n`;
  await testInfo.attach("interaction-latency.json", {
    body: report,
    contentType: "application/json"
  });
  await mkdir(PERFORMANCE_RESULTS, { recursive: true });
  await writeFile(`${PERFORMANCE_RESULTS}/browser-interaction.json`, report);
});

async function installScaleDocument(page: Page, nodeCount: number): Promise<void> {
  const initialCount = await page.locator("#app [data-unifold-node-id]").count();
  const source = await page.evaluate(readAuthoredDocument);
  const passiveCount = nodeCount - initialCount - 2;
  if (passiveCount < 1)
    throw new Error(`Scale target is smaller than the reference: ${nodeCount}.`);
  source.view = scaleView(source.view, passiveCount);
  const result = await page.evaluate(applyAuthoredDocument, source);
  expect(result.status).toBe("applied");
  await page.evaluate(waitForAllHosts);
  await expect(page.locator("#app [data-unifold-node-id]")).toHaveCount(nodeCount);
}

async function measureLatencySamples(page: Page): Promise<LatencySummary> {
  for (let index = 0; index < 3; index += 1) {
    await measureInteractionLatency(page, `warmup-${index}`);
  }
  const samples: number[] = [];
  for (let index = 0; index < 20; index += 1) {
    samples.push(await measureInteractionLatency(page, `sample-${index}`));
  }
  expect(samples.every((value) => Number.isFinite(value) && value >= 0)).toBe(true);
  return latencySummary(samples);
}

async function measureInteractionLatency(page: Page, value: string): Promise<number> {
  await page.evaluate((targetId) => {
    const target = document.querySelector<ScaleHost>(`[data-unifold-node-id="${targetId}"]`);
    if (target === null) throw new Error("The latency target is unavailable.");
    target.addEventListener(
      "unifold-event",
      () => ((window as unknown as LatencyWindow).__unifoldLatencyStart = performance.now()),
      { once: true }
    );
  }, TARGET_ID);
  await page.getByLabel("Scale target").fill(value);
  return page.evaluate(measureNextFrameLatency, TARGET_ID);
}

async function measureNextFrameLatency(targetId: string): Promise<number> {
  const target = document.querySelector<ScaleHost>(`[data-unifold-node-id="${targetId}"]`);
  const start = (window as unknown as LatencyWindow).__unifoldLatencyStart;
  if (target === null || start === undefined) throw new Error("Latency evidence is unavailable.");
  await target.updateComplete;
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  return performance.now() - start;
}

function latencySummary(samples: readonly number[]): LatencySummary {
  const ordered = [...samples].sort((left, right) => left - right);
  return {
    maximumMilliseconds: ordered.at(-1) as number,
    p50Milliseconds: latencyPercentile(ordered, 0.5),
    p95Milliseconds: latencyPercentile(ordered, 0.95),
    p99Milliseconds: latencyPercentile(ordered, 0.99),
    sampleCount: ordered.length
  };
}

function latencyPercentile(ordered: readonly number[], quantile: number): number {
  const index = Math.min(ordered.length - 1, Math.ceil(quantile * ordered.length) - 1);
  return ordered[Math.max(0, index)] as number;
}

function scaleView(original: Record<string, unknown>, passiveCount: number) {
  return {
    $children: [original, targetNode(), ...passiveNodes(passiveCount)],
    $comp: "Box",
    id: "scale-root"
  };
}

function targetNode() {
  return { $comp: "TextField", id: TARGET_ID, label: "Scale target" };
}

function passiveNodes(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    $comp: "Text",
    content: "Passive",
    id: `scale-passive-${String(index).padStart(5, "0")}`
  }));
}

function readAuthoredDocument(): ScaleDocument {
  const source = (window as unknown as ScaleWindow).__unifoldAuthoredDocument;
  if (source === undefined) throw new Error("The authored document hook is unavailable.");
  return structuredClone(source);
}

function applyAuthoredDocument(source: ScaleDocument): ScaleUpdateResult {
  return (window as unknown as ScaleWindow).__unifoldUpdateDocument(source);
}

async function waitForAllHosts(): Promise<void> {
  const hosts = [...document.querySelectorAll<ScaleHost>("#app [data-unifold-node-id]")];
  await Promise.all(hosts.map(({ updateComplete }) => updateComplete));
}

async function captureScaleBaseline(page: Page): Promise<void> {
  await page.evaluate((targetId) => {
    const elements = document.querySelectorAll<ScaleHost>("#app [data-unifold-node-id]");
    const hosts = new Map([...elements].map((host) => [host.dataset["unifoldNodeId"] || "", host]));
    const target = hosts.get(targetId) as ScaleHost;
    const input = (target.shadowRoot as ShadowRoot).querySelector("input") as HTMLInputElement;
    const mutations: string[] = [];
    const observer = new MutationObserver((records) =>
      records.forEach(({ target }) =>
        mutations.push((target as HTMLElement).dataset["unifoldNodeId"] || "")
      )
    );
    observer.observe(document.querySelector("#app") as Element, {
      attributeFilter: ["data-unifold-render-count"],
      attributes: true,
      subtree: true
    });
    (window as unknown as ScaleWindow).__unifoldScaleBaseline = {
      counts: new Map(
        [...hosts].map(([id, host]) => [id, Number(host.dataset["unifoldRenderCount"] || 0)])
      ),
      eventStart: (window as unknown as ScaleWindow).__unifoldCapturedEvents.length,
      hosts,
      input,
      mutations,
      observer,
      target
    };
  }, TARGET_ID);
}

async function readScaleObservation(page: Page): Promise<ScaleObservation> {
  await page.evaluate(async () => {
    const baseline = (window as unknown as ScaleWindow).__unifoldScaleBaseline;
    if (baseline === undefined) throw new Error("The scale baseline is unavailable.");
    await baseline.target.updateComplete;
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  });
  return {
    ...(await readIdentityObservation(page)),
    ...(await readFocusObservation(page)),
    mutations: await readMutationObservation(page),
    ...(await readEventObservation(page))
  };
}

async function readIdentityObservation(page: Page) {
  return page.evaluate((targetId) => {
    const baseline = (window as unknown as ScaleWindow).__unifoldScaleBaseline;
    if (baseline === undefined) throw new Error("The scale baseline is unavailable.");
    const elements = document.querySelectorAll<ScaleHost>("#app [data-unifold-node-id]");
    const current = new Map(
      [...elements].map((host) => [host.getAttribute("data-unifold-node-id") || "", host])
    );
    const deltas = [...current].map(
      ([id, host]) =>
        [
          id,
          Number(host.getAttribute("data-unifold-render-count") || 0) -
            (baseline.counts.get(id) || 0)
        ] as const
    );
    const targetEntry = deltas.find(([id]) => id === targetId);
    return {
      hostCount: current.size,
      identitiesRetained: [...baseline.hosts].every(([id, host]) => current.get(id) === host),
      targetDelta: targetEntry === undefined ? 0 : targetEntry[1],
      unrelatedChanges: deltas.filter(([id, delta]) => id !== targetId && delta !== 0).length
    };
  }, TARGET_ID);
}

async function readFocusObservation(page: Page) {
  return page.evaluate(() => {
    const baseline = (window as unknown as ScaleWindow).__unifoldScaleBaseline;
    if (baseline === undefined) throw new Error("The scale baseline is unavailable.");
    const root = baseline.target.shadowRoot;
    if (root === null) throw new Error("The scale shadow root is unavailable.");
    return {
      hostFocused: document.activeElement === baseline.target,
      inputFocused: root.activeElement === baseline.input,
      inputRetained: root.querySelector("input") === baseline.input
    };
  });
}

async function readMutationObservation(page: Page) {
  return page.evaluate(() => {
    const baseline = (window as unknown as ScaleWindow).__unifoldScaleBaseline;
    if (baseline === undefined) throw new Error("The scale baseline is unavailable.");
    baseline.observer
      .takeRecords()
      .forEach(({ target }) =>
        baseline.mutations.push((target as HTMLElement).dataset["unifoldNodeId"] || "")
      );
    baseline.observer.disconnect();
    const ids = baseline.mutations;
    return Object.fromEntries(
      [...new Set(ids)].map((id) => [id, ids.filter((item) => item === id).length])
    );
  });
}

async function readEventObservation(page: Page) {
  return page.evaluate(() => {
    function changedNodeIds(event: ScaleEvent): readonly string[] {
      if (event.data.change === undefined) return [];
      return event.data.change.changedNodeIds ?? [];
    }
    const baseline = (window as unknown as ScaleWindow).__unifoldScaleBaseline;
    if (baseline === undefined) throw new Error("The scale baseline is unavailable.");
    const events = (window as unknown as ScaleWindow).__unifoldCapturedEvents.slice(
      baseline.eventStart
    );
    const committed = [...events]
      .reverse()
      .find(({ type }) => type === "org.unifold.ui.transaction.committed.v1");
    if (committed === undefined) throw new Error("The committed scale event is unavailable.");
    return {
      changedNodeIds: changedNodeIds(committed),
      eventTypes: events.map(({ type }) => type)
    };
  });
}

function assertScaleObservation(observation: ScaleObservation, nodeCount: number): void {
  expect(observation.hostCount).toBe(nodeCount);
  expect(observation.identitiesRetained).toBe(true);
  expect(observation.inputRetained).toBe(true);
  expect(observation.hostFocused).toBe(true);
  expect(observation.inputFocused).toBe(true);
  expect(observation.targetDelta).toBe(1);
  expect(observation.unrelatedChanges).toBe(0);
  expect(observation.mutations).toEqual({ [TARGET_ID]: 1 });
  expect(observation.eventTypes).toEqual([
    ElementEventType.ControlInput,
    UiEventType.CommandApplied,
    UiEventType.TransactionCommitted
  ]);
  expect(observation.changedNodeIds).toEqual([TARGET_ID]);
}

interface ScaleDocument {
  view: Record<string, unknown>;
}

interface ScaleEvent {
  readonly data: { readonly change?: { readonly changedNodeIds?: readonly string[] } };
  readonly type: string;
}

interface ScaleHost extends HTMLElement {
  readonly updateComplete: Promise<unknown>;
}

interface ScaleBaseline {
  readonly counts: Map<string, number>;
  readonly eventStart: number;
  readonly hosts: Map<string, ScaleHost>;
  readonly input: HTMLInputElement;
  readonly mutations: string[];
  readonly observer: MutationObserver;
  readonly target: ScaleHost;
}

interface ScaleObservation {
  readonly changedNodeIds: readonly string[];
  readonly eventTypes: readonly string[];
  readonly hostCount: number;
  readonly hostFocused: boolean;
  readonly identitiesRetained: boolean;
  readonly inputFocused: boolean;
  readonly inputRetained: boolean;
  readonly mutations: Readonly<Record<string, number>>;
  readonly targetDelta: number;
  readonly unrelatedChanges: number;
}

interface ScaleUpdateResult {
  readonly status: string;
}

interface ScaleWindow {
  readonly __unifoldAuthoredDocument: ScaleDocument;
  readonly __unifoldCapturedEvents: readonly ScaleEvent[];
  __unifoldScaleBaseline?: ScaleBaseline;
  __unifoldUpdateDocument(source: ScaleDocument): ScaleUpdateResult;
}

interface LatencySummary {
  readonly maximumMilliseconds: number;
  readonly p50Milliseconds: number;
  readonly p95Milliseconds: number;
  readonly p99Milliseconds: number;
  readonly sampleCount: number;
}

interface LatencyWindow extends ScaleWindow {
  __unifoldLatencyStart?: number;
}
