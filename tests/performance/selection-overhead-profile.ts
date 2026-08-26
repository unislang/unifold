import { percentile } from "./profile-statistics.js";
import { TEN_THOUSAND_NODES, createScaleHarness, updateOne } from "./scale-fixture.js";

const BATCH_SIZE = 5;
const SAMPLE_COUNT = 50;
const WARMUP_COUNT = 10;

export const SELECTION_OVERHEAD_GATE_NAME = "10k indexed-selection dispatch overhead";

export function measureSelectionDispatchOverhead() {
  const baseline = createScaleHarness(TEN_THOUSAND_NODES, false);
  const selected = createScaleHarness(TEN_THOUSAND_NODES);
  try {
    warmup(baseline, selected);
    const samples = Array.from({ length: SAMPLE_COUNT }, (_, index) =>
      measurePair(baseline, selected, index, WARMUP_COUNT + index * BATCH_SIZE + 1)
    );
    return summarize(samples);
  } finally {
    baseline.store.dispose();
    selected.store.dispose();
  }
}

function warmup(
  baseline: ReturnType<typeof createScaleHarness>,
  selected: ReturnType<typeof createScaleHarness>
): void {
  for (let index = 1; index <= WARMUP_COUNT; index += 1) {
    updateOne(baseline, index);
    updateOne(selected, index);
  }
}

function measurePair(
  baseline: ReturnType<typeof createScaleHarness>,
  selected: ReturnType<typeof createScaleHarness>,
  sampleIndex: number,
  firstSequence: number
): number {
  const differences = Array.from({ length: BATCH_SIZE }, (_, offset) =>
    updatePairDifference(baseline, selected, sampleIndex + offset, firstSequence + offset)
  );
  return percentile(differences, 0.5);
}

function updatePairDifference(
  baseline: ReturnType<typeof createScaleHarness>,
  selected: ReturnType<typeof createScaleHarness>,
  order: number,
  sequence: number
): number {
  if (order % 2 === 0) return selectedFirstDifference(baseline, selected, sequence);
  const baselineMilliseconds = elapsed(() => updateOne(baseline, sequence));
  const selectedMilliseconds = elapsed(() => updateOne(selected, sequence));
  return selectedMilliseconds - baselineMilliseconds;
}

function selectedFirstDifference(
  baseline: ReturnType<typeof createScaleHarness>,
  selected: ReturnType<typeof createScaleHarness>,
  sequence: number
): number {
  const selectedMilliseconds = elapsed(() => updateOne(selected, sequence));
  const baselineMilliseconds = elapsed(() => updateOne(baseline, sequence));
  return selectedMilliseconds - baselineMilliseconds;
}

function elapsed(update: () => void): number {
  const startedAt = performance.now();
  update();
  return performance.now() - startedAt;
}

function summarize(samples: readonly number[]) {
  return {
    maximumMilliseconds: Math.max(...samples),
    meanMilliseconds: samples.reduce((sum, value) => sum + value, 0) / samples.length,
    minimumMilliseconds: Math.min(...samples),
    p50Milliseconds: percentile(samples, 0.5),
    p95Milliseconds: percentile(samples, 0.95),
    p99Milliseconds: percentile(samples, 0.99),
    sampleCount: samples.length
  };
}
