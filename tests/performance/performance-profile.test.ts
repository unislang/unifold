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
  NORMALIZE_2000_DOCUMENT_NAME,
  compileCachedDocument,
  compileColdDocument,
  compileComposedDocument,
  compileComposedRevision,
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
  replay,
  updateAggregateOne,
  updateBulk,
  updateOne
} from "./scale-fixture.js";
import {
  SELECTION_OVERHEAD_GATE_NAME,
  measureSelectionDispatchOverhead
} from "./selection-overhead-profile.js";

const outputPath = process.env["UNIFOLD_PERFORMANCE_PROFILE_OUTPUT"];

it.runIf(outputPath !== undefined)(
  "writes direct percentiles and heap-retention evidence",
  async () => {
    const profile = await measureProfile();
    await writeFile(outputPath as string, `${JSON.stringify(profile, null, 2)}\n`);
    expect(profile.heap.retainedHeapBytes).toBeLessThan(64 * 1024 * 1024);
    expect(profile.gates.every(({ passed }) => passed)).toBe(true);
  }
);

async function measureProfile() {
  const harnesses = createHarnesses();
  try {
    const bench = createBench(harnesses);
    await bench.warmup();
    await bench.run();
    const timings = timingResults(bench);
    const canonicalEventPath = measureCanonicalEventPath();
    const selectionOverhead = measureSelectionDispatchOverhead();
    return {
      canonicalEventPath,
      gates: timingGates(timings, selectionOverhead, canonicalEventPath),
      heap: measureHeapRetention(),
      selectionOverhead,
      timings
    };
  } finally {
    Object.values(harnesses).forEach((harness) => {
      if ("store" in harness) harness.store.dispose();
      if ("runtime" in harness) harness.runtime.dispose();
    });
  }
}

function createBench(harnesses: ReturnType<typeof createHarnesses>): Bench {
  let sequence = 0;
  return new Bench({ iterations: 20, time: 250, warmupIterations: 5, warmupTime: 50 })
    .add("1k selective leaf edit", () => updateOne(harnesses.oneThousand, ++sequence))
    .add("100-control aggregate leaf edit", () =>
      updateAggregateOne(harnesses.hundredControlAggregate, ++sequence)
    )
    .add(REACTIVE_TRANSACTION_BENCHMARK_NAME, () =>
      executeReactiveTransaction(harnesses.reactiveTransaction, ++sequence)
    )
    .add(COLD_500_COMPILATION_NAME, () => compileColdDocument(harnesses.compilation))
    .add(CACHED_500_COMPILATION_NAME, () => compileCachedDocument(harnesses.compilation))
    .add(NORMALIZE_2000_DOCUMENT_NAME, () => normalizeLargeDocument(harnesses.compilation))
    .add(COMPOSED_500_COMPILATION_NAME, () => compileComposedDocument(harnesses.compilation))
    .add(COMPOSED_500_REVISION_NAME, () => compileComposedRevision(harnesses.compilation))
    .add("10k selection-free leaf edit", () => updateOne(harnesses.baseline, ++sequence))
    .add("10k selective leaf edit", () => updateOne(harnesses.selected, ++sequence))
    .add("10k one-percent bulk edit", () => updateBulk(harnesses.bulk, ++sequence))
    .add("10k one-hundred-sibling reconcile", () =>
      reorderFirstGroup(harnesses.reorder, ++sequence)
    )
    .add("10k one-hundred-transaction replay", () =>
      replay(harnesses.replay, 100, (sequence += 100))
    )
    .add("10k aggregate-heavy leaf edit", () => updateAggregateOne(harnesses.aggregate, ++sequence))
    .add("1k rule graph with 25 affected rules", () =>
      evaluateRuleChain(harnesses.rules, 0, ++sequence)
    );
}

function createHarnesses() {
  return {
    aggregate: createAggregateScaleHarness(TEN_THOUSAND_NODES),
    baseline: createScaleHarness(TEN_THOUSAND_NODES, false),
    bulk: createScaleHarness(TEN_THOUSAND_NODES),
    compilation: createDocumentCompilationHarness(),
    hundredControlAggregate: createAggregateScaleHarness(ONE_HUNDRED_CONTROL_FORM_NODES, 10),
    oneThousand: createScaleHarness(ONE_THOUSAND_NODES),
    reorder: createScaleHarness(TEN_THOUSAND_NODES),
    replay: createScaleHarness(TEN_THOUSAND_NODES),
    reactiveTransaction: createReactiveTransactionHarness(),
    rules: createRuleScaleHarness(),
    selected: createScaleHarness(TEN_THOUSAND_NODES)
  };
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
    timingGate(SELECTION_OVERHEAD_GATE_NAME, selectionOverhead.p95Milliseconds, 2),
    timingGate(CANONICAL_EVENT_GATE_NAME, canonicalEventPath.p95Milliseconds, 8),
    timingGate(COLD_500_COMPILATION_NAME, requireP95(timings, COLD_500_COMPILATION_NAME), 50),
    timingGate(CACHED_500_COMPILATION_NAME, requireP95(timings, CACHED_500_COMPILATION_NAME), 16),
    timingGate(
      NORMALIZE_2000_DOCUMENT_NAME,
      requireP95(timings, NORMALIZE_2000_DOCUMENT_NAME),
      200
    ),
    ...compositionCompilationGates(timings)
  ];
}

function compositionCompilationGates(timings: ReturnType<typeof timingResults>) {
  return [
    timingGate(
      COMPOSED_500_COMPILATION_NAME,
      requireP95(timings, COMPOSED_500_COMPILATION_NAME),
      100
    ),
    timingGate(COMPOSED_500_REVISION_NAME, requireP95(timings, COMPOSED_500_REVISION_NAME), 100)
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
