import { writeFile } from "node:fs/promises";
import { Bench } from "tinybench";
import { expect, it } from "vitest";

import { summarizeTiming } from "./profile-statistics.js";
import { CANONICAL_EVENT_GATE_NAME, measureCanonicalEventPath } from "./canonical-event-fixture.js";
import {
  CACHED_500_COMPILATION_NAME,
  COLD_500_COMPILATION_NAME,
  COMPOSED_500_COMPILATION_NAME,
  COMPOSED_500_REVISION_NAME,
  LAYOUT_500_COMPILATION_NAME,
  NORMALIZE_2000_DOCUMENT_NAME,
  compileCachedDocument,
  compileColdDocument,
  compileComposedDocument,
  compileComposedRevision,
  compileLayoutDocument,
  createDocumentCompilationHarness,
  normalizeLargeDocument
} from "./document-compilation-fixture.js";
import { createRuleScaleHarness, evaluateRuleChain } from "./rule-scale-fixture.js";
import {
  REACTIVE_TRANSACTION_BENCHMARK_NAME,
  createReactiveTransactionHarness,
  executeReactiveTransaction
} from "./reactive-transaction-fixture.js";
import {
  ONE_THOUSAND_NODES,
  ONE_HUNDRED_CONTROL_FORM_NODES,
  TEN_THOUSAND_NODES,
  createAggregateScaleHarness,
  createScaleHarness,
  reorderFirstGroup,
  setAggregateDisabled,
  updateAggregateOne,
  updateBulk,
  updateOne
} from "./scale-fixture.js";
import {
  SELECTION_OVERHEAD_GATE_NAME,
  measureSelectionDispatchOverhead
} from "./selection-overhead-profile.js";

const outputPath = process.env["UNIFOLD_PERFORMANCE_PROFILE_OUTPUT"];
const harnessesByBench = new WeakMap<Bench, readonly unknown[]>();
let measuredTimings: ReturnType<typeof timingResults> = {};

it.runIf(outputPath !== undefined)("measures core selective timing evidence", async () => {
  measuredTimings = { ...measuredTimings, ...(await measureBench(createCoreBench())) };
});

it.runIf(outputPath !== undefined)("measures structural reconcile timing evidence", async () => {
  await recordBench(createReorderBench());
});

it.runIf(outputPath !== undefined)("measures aggregate leaf timing evidence", async () => {
  await recordBench(createAggregateBench());
});

it.runIf(outputPath !== undefined)("measures disabled cascade timing evidence", async () => {
  await recordBench(createDisabledBench());
});

it.runIf(outputPath !== undefined)("measures compilation timing evidence", async () => {
  measuredTimings = { ...measuredTimings, ...(await measureBench(createCompilationBench())) };
});

it.runIf(outputPath !== undefined)("writes direct percentile and heap evidence", async () => {
  const profile = measureProfile(measuredTimings);
  await writeFile(outputPath as string, `${JSON.stringify(profile, null, 2)}\n`);
  expect(profile.heap.retainedHeapBytes).toBeLessThan(64 * 1024 * 1024);
  expect(profile.gates.every(({ passed }) => passed)).toBe(true);
});

async function measureBench(subject: Bench) {
  try {
    await subject.warmup();
    await subject.run();
    return timingResults(subject);
  } finally {
    disposeHarnesses(subject);
  }
}

async function recordBench(subject: Bench): Promise<void> {
  measuredTimings = { ...measuredTimings, ...(await measureBench(subject)) };
}

function measureProfile(timings: ReturnType<typeof timingResults>) {
  const canonicalEventPath = measureCanonicalEventPath();
  const selectionOverhead = measureSelectionDispatchOverhead();
  return {
    canonicalEventPath,
    gates: timingGates(timings, selectionOverhead, canonicalEventPath),
    heap: measureHeapRetention(),
    selectionOverhead,
    timings
  };
}

function baseBench(iterations = 20, warmupIterations = 5): Bench {
  return new Bench({ iterations, time: 250, warmupIterations, warmupTime: 50 });
}

function createCoreBench(): Bench {
  const harnesses = createCoreHarnesses();
  let sequence = 0;
  return trackHarnesses(baseBench(), harnesses)
    .add("1k selective leaf edit", () => updateOne(harnesses.oneThousand, ++sequence))
    .add("100-control aggregate leaf edit", () =>
      updateAggregateOne(harnesses.hundredControlAggregate, ++sequence)
    )
    .add(REACTIVE_TRANSACTION_BENCHMARK_NAME, () =>
      executeReactiveTransaction(harnesses.reactiveTransaction, ++sequence)
    )
    .add("10k selection-free leaf edit", () => updateOne(harnesses.baseline, ++sequence))
    .add("10k selective leaf edit", () => updateOne(harnesses.selected, ++sequence))
    .add("10k one-percent bulk edit", () => updateBulk(harnesses.bulk, ++sequence));
}

function createReorderBench(): Bench {
  const harness = createScaleHarness(TEN_THOUSAND_NODES);
  let sequence = 0;
  return trackHarnesses(baseBench(8, 2), { harness }).add("10k one-hundred-sibling reconcile", () =>
    reorderFirstGroup(harness, ++sequence)
  );
}

function createAggregateBench(): Bench {
  const harness = createAggregateScaleHarness(TEN_THOUSAND_NODES);
  let sequence = 0;
  return trackHarnesses(baseBench(12), { harness }).add("10k aggregate-heavy leaf edit", () =>
    updateAggregateOne(harness, ++sequence)
  );
}

function createDisabledBench(): Bench {
  const harness = createAggregateScaleHarness(TEN_THOUSAND_NODES);
  let sequence = 0;
  return trackHarnesses(baseBench(12), { harness }).add("10k aggregate disabled cascade", () =>
    setAggregateDisabled(harness, ++sequence % 2 === 0)
  );
}

function createCompilationBench(): Bench {
  const harnesses = createCompilationHarnesses();
  let sequence = 0;
  return trackHarnesses(baseBench(), harnesses)
    .add(COLD_500_COMPILATION_NAME, () => compileColdDocument(harnesses.compilation))
    .add(CACHED_500_COMPILATION_NAME, () => compileCachedDocument(harnesses.compilation))
    .add(NORMALIZE_2000_DOCUMENT_NAME, () => normalizeLargeDocument(harnesses.compilation))
    .add(COMPOSED_500_COMPILATION_NAME, () => compileComposedDocument(harnesses.compilation))
    .add(COMPOSED_500_REVISION_NAME, () => compileComposedRevision(harnesses.compilation))
    .add(LAYOUT_500_COMPILATION_NAME, () => compileLayoutDocument(harnesses.compilation))
    .add("1k rule graph with 25 affected rules", () =>
      evaluateRuleChain(harnesses.rules, 0, ++sequence)
    );
}

function createCoreHarnesses() {
  return {
    baseline: createScaleHarness(TEN_THOUSAND_NODES, false),
    bulk: createScaleHarness(TEN_THOUSAND_NODES),
    hundredControlAggregate: createAggregateScaleHarness(ONE_HUNDRED_CONTROL_FORM_NODES, 10),
    oneThousand: createScaleHarness(ONE_THOUSAND_NODES),
    reactiveTransaction: createReactiveTransactionHarness(),
    selected: createScaleHarness(TEN_THOUSAND_NODES)
  };
}

function createCompilationHarnesses() {
  return { compilation: createDocumentCompilationHarness(), rules: createRuleScaleHarness() };
}

function trackHarnesses<T extends Record<string, unknown>>(bench: Bench, harnesses: T): Bench {
  harnessesByBench.set(bench, Object.values(harnesses));
  return bench;
}

function disposeHarnesses(bench: Bench): void {
  harnessesByBench.get(bench)?.forEach(disposeHarness);
  harnessesByBench.delete(bench);
}

function disposeHarness(value: unknown): void {
  if (!isRecord(value)) return;
  disposeCandidate(Reflect.get(value, "store"));
  disposeCandidate(Reflect.get(value, "runtime"));
}

function disposeCandidate(value: unknown): void {
  if (!isRecord(value)) return;
  const dispose = Reflect.get(value, "dispose") as unknown;
  if (typeof dispose === "function") dispose.call(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  if (value === null) return false;
  return typeof value === "object";
}

function timingResults(bench: Bench) {
  return Object.fromEntries(
    bench.tasks.map((task) => {
      if (task.result === undefined) throw new Error(`Missing timing result: ${task.name}.`);
      return [task.name, summarizeTiming(task.result)];
    })
  );
}

function timingGates(
  timings: ReturnType<typeof timingResults>,
  selectionOverhead: ReturnType<typeof measureSelectionDispatchOverhead>,
  canonicalEventPath: ReturnType<typeof measureCanonicalEventPath>
) {
  return [
    timingGate(
      REACTIVE_TRANSACTION_BENCHMARK_NAME,
      requireP95(timings, REACTIVE_TRANSACTION_BENCHMARK_NAME),
      8
    ),
    timingGate(
      "1k rule graph with 25 affected rules",
      requireP95(timings, "1k rule graph with 25 affected rules"),
      4
    ),
    timingGate(SELECTION_OVERHEAD_GATE_NAME, selectionOverhead.p95Milliseconds, 5),
    timingGate(CANONICAL_EVENT_GATE_NAME, canonicalEventPath.p95Milliseconds, 8),
    ...documentCompilationGates(timings),
    timingGate(
      "10k aggregate disabled cascade",
      requireP95(timings, "10k aggregate disabled cascade"),
      1_000
    ),
    ...compositionCompilationGates(timings)
  ];
}

function documentCompilationGates(timings: ReturnType<typeof timingResults>) {
  return [
    timingGate(COLD_500_COMPILATION_NAME, requireP95(timings, COLD_500_COMPILATION_NAME), 50),
    timingGate(CACHED_500_COMPILATION_NAME, requireP95(timings, CACHED_500_COMPILATION_NAME), 16),
    timingGate(
      NORMALIZE_2000_DOCUMENT_NAME,
      requireP95(timings, NORMALIZE_2000_DOCUMENT_NAME),
      200
    ),
    timingGate(LAYOUT_500_COMPILATION_NAME, requireP95(timings, LAYOUT_500_COMPILATION_NAME), 100)
  ];
}

function compositionCompilationGates(timings: ReturnType<typeof timingResults>) {
  return [
    timingGate(
      COMPOSED_500_COMPILATION_NAME,
      requireP95(timings, COMPOSED_500_COMPILATION_NAME),
      125
    ),
    timingGate(COMPOSED_500_REVISION_NAME, requireP95(timings, COMPOSED_500_REVISION_NAME), 125)
  ];
}

function timingGate(name: string, actualP95Milliseconds: number, limitP95Milliseconds: number) {
  return {
    actualP95Milliseconds,
    limitP95Milliseconds,
    name,
    passed: actualP95Milliseconds <= limitP95Milliseconds
  };
}

function requireP95(timings: ReturnType<typeof timingResults>, name: string): number {
  const timing = timings[name];
  if (timing === undefined) throw new Error(`Missing gated timing result: ${name}.`);
  return timing.p95Milliseconds;
}

function measureHeapRetention() {
  const collect = garbageCollector();
  collect();
  const baselineHeapBytes = process.memoryUsage().heapUsed;
  let peakHeapBytes = baselineHeapBytes;
  for (let cycle = 0; cycle < 5; cycle += 1) {
    const harness = createScaleHarness(TEN_THOUSAND_NODES, false);
    updateOne(harness, cycle + 1);
    harness.store.dispose();
    peakHeapBytes = Math.max(peakHeapBytes, process.memoryUsage().heapUsed);
  }
  collect();
  const finalHeapBytes = process.memoryUsage().heapUsed;
  return {
    baselineHeapBytes,
    cycles: 5,
    finalHeapBytes,
    nodeCount: TEN_THOUSAND_NODES,
    peakHeapBytes,
    retainedHeapBytes: Math.max(0, finalHeapBytes - baselineHeapBytes)
  };
}

function garbageCollector(): () => void {
  const candidate = Reflect.get(globalThis, "gc") as unknown;
  if (typeof candidate !== "function") throw new Error("The profile requires --expose-gc.");
  return candidate as () => void;
}
