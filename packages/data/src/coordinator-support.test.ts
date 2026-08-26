import { expect, it, vi } from "vitest";

import {
  commitOptimistic,
  dataPreflight,
  invalidationMessage,
  linkAbortSignal,
  shouldRetry
} from "./coordinator-support.js";
import { mutation, query, success } from "./data.test-data.js";
import { DataSourceRegistry } from "./registry.js";
import {
  DataErrorCode,
  DataResultStatus,
  type DataFailureResult,
  type DataRetryPolicy
} from "./types.js";

it("preflights registered operations and links cancellation", () => {
  const registry = new DataSourceRegistry();
  const handler = vi.fn();
  registry.register("customers.search", handler);
  const registered = dataPreflight(registry, query());
  const invalid = dataPreflight(registry, { ...query(), requestId: "__proto__" });
  const source = new AbortController();
  source.abort();
  const linked = new AbortController();
  linkAbortSignal(source.signal, linked);

  expect("handler" in registered && registered.handler).toBe(handler);
  expect("resolution" in invalid && invalid.resolution.result.status).toBe(
    DataResultStatus.ValidationError
  );
  expect(linked.signal.aborted).toBe(true);
});

it("builds revision notifications, bounds retry, and contains optimistic commit failures", async () => {
  const message = invalidationMessage(mutation(), success("revision-2"), "now", "tab-a");
  const unavailable: DataFailureResult = {
    error: { code: DataErrorCode.Unavailable, messageKey: "data.unavailable" },
    status: DataResultStatus.Unavailable
  };
  const policy: DataRetryPolicy = {
    baseDelayMs: 0,
    jitterRatio: 0,
    maxAttempts: 2,
    maxDelayMs: 0
  };

  expect(message.revision).toBe("revision-2");
  expect(shouldRetry(unavailable, 1, policy)).toBe(true);
  expect(shouldRetry(unavailable, 2, policy)).toBe(false);
  await expect(
    commitOptimistic(
      { commit: () => Promise.reject(new Error("projection failed")), rollback: vi.fn() },
      success()
    )
  ).resolves.toBeUndefined();
});
