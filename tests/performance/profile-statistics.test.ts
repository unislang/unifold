import { expect, it } from "vitest";

import { percentile, summarizeSamples } from "./profile-statistics.js";

it("calculates nearest-rank percentiles without mutating samples", () => {
  const samples = [4, 1, 3, 2];
  expect(percentile(samples, 0)).toBe(1);
  expect(percentile(samples, 0.5)).toBe(2);
  expect(percentile(samples, 0.95)).toBe(4);
  expect(percentile(samples, 1)).toBe(4);
  expect(samples).toEqual([4, 1, 3, 2]);
});

it("rejects missing samples and invalid quantiles", () => {
  expect(() => percentile([], 0.5)).toThrow("at least one sample");
  expect(() => percentile([1], -0.1)).toThrow("from 0 to 1");
  expect(() => percentile([1], 1.1)).toThrow("from 0 to 1");
});

it("summarizes direct timing samples", () => {
  expect(summarizeSamples([4, 1, 3, 2])).toEqual({
    maximumMilliseconds: 4,
    p50Milliseconds: 2,
    p95Milliseconds: 4,
    p99Milliseconds: 4
  });
});
