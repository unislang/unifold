import {
  DataResultStatus,
  type DataFailureResult,
  type DataResult,
  type DataRetryPolicy
} from "./types.js";

export function resolveDataRetryPolicy(
  defaults: DataRetryPolicy,
  override: Partial<DataRetryPolicy> = {}
): DataRetryPolicy {
  const policy = { ...defaults, ...override };
  if (validRetryPolicy(policy)) return Object.freeze(policy);
  throw new RangeError("Invalid bounded data retry policy.");
}

function validRetryPolicy(policy: DataRetryPolicy): boolean {
  return [
    Number.isInteger(policy.maxAttempts),
    policy.maxAttempts >= 1,
    policy.maxAttempts <= 5,
    policy.baseDelayMs >= 0,
    policy.maxDelayMs >= policy.baseDelayMs,
    policy.maxDelayMs <= 60_000,
    policy.jitterRatio >= 0,
    policy.jitterRatio <= 1
  ].every(Boolean);
}

export function isRetryableDataResult(result: DataResult): result is DataFailureResult {
  return (
    result.status === DataResultStatus.RateLimited ||
    result.status === DataResultStatus.Timeout ||
    result.status === DataResultStatus.Unavailable
  );
}

export function dataRetryDelay(policy: DataRetryPolicy, attempts: number, random: number): number {
  const exponential = Math.min(policy.maxDelayMs, policy.baseDelayMs * 2 ** (attempts - 1));
  const boundedRandom = Math.min(1, Math.max(0, random));
  return Math.round(
    exponential * (1 - policy.jitterRatio + 2 * policy.jitterRatio * boundedRandom)
  );
}

export function waitForDataRetry(delay: number, signal: AbortSignal): Promise<boolean> {
  if (delay === 0) return Promise.resolve(!signal.aborted);
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(true), delay);
    signal.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        resolve(false);
      },
      { once: true }
    );
  });
}
