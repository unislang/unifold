import type { TaskResult } from "tinybench";

interface TimingSummary {
  readonly maximumMilliseconds: number;
  readonly meanMilliseconds: number;
  readonly minimumMilliseconds: number;
  readonly p50Milliseconds: number;
  readonly p95Milliseconds: number;
  readonly p99Milliseconds: number;
  readonly relativeMarginOfError: number;
  readonly sampleCount: number;
}

export function summarizeTiming(result: TaskResult): TimingSummary {
  if (result.samples.length === 0) throw new Error("Timing samples are required.");
  return {
    maximumMilliseconds: result.max,
    meanMilliseconds: result.mean,
    minimumMilliseconds: result.min,
    p50Milliseconds: percentile(result.samples, 0.5),
    p95Milliseconds: percentile(result.samples, 0.95),
    p99Milliseconds: percentile(result.samples, 0.99),
    relativeMarginOfError: result.rme,
    sampleCount: result.samples.length
  };
}

export function percentile(samples: readonly number[], quantile: number): number {
  if (samples.length === 0) throw new Error("Percentiles require at least one sample.");
  assertQuantile(quantile);
  const ordered = [...samples].sort((left, right) => left - right);
  const index = Math.min(ordered.length - 1, Math.ceil(quantile * ordered.length) - 1);
  return ordered[Math.max(0, index)] as number;
}

function assertQuantile(quantile: number): void {
  if (quantile < 0) throw new Error("Percentiles require a quantile from 0 to 1.");
  if (quantile > 1) throw new Error("Percentiles require a quantile from 0 to 1.");
}
