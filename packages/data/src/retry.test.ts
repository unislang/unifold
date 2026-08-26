import { expect, it } from "vitest";

import {
  dataRetryDelay,
  isRetryableDataResult,
  resolveDataRetryPolicy,
  waitForDataRetry
} from "./retry.js";
import { DataErrorCode, DataResultStatus, type DataFailureResult } from "./types.js";

it("bounds deterministic exponential retry policy and status selection", () => {
  const policy = resolveDataRetryPolicy(
    { baseDelayMs: 100, jitterRatio: 0.2, maxAttempts: 3, maxDelayMs: 1_000 },
    { maxAttempts: 4 }
  );
  const unavailable: DataFailureResult = {
    error: { code: DataErrorCode.Unavailable, messageKey: "data.unavailable" },
    status: DataResultStatus.Unavailable
  };

  expect(dataRetryDelay(policy, 2, 0)).toBe(160);
  expect(dataRetryDelay(policy, 2, 1)).toBe(240);
  expect(isRetryableDataResult(unavailable)).toBe(true);
  expect(() => resolveDataRetryPolicy(policy, { maxAttempts: 6 })).toThrow(RangeError);
});

it("settles a pending retry immediately when canceled", async () => {
  const controller = new AbortController();
  const pending = waitForDataRetry(60_000, controller.signal);
  controller.abort();
  await expect(pending).resolves.toBe(false);
});
