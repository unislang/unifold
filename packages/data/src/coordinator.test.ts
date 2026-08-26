import { expect, it, vi } from "vitest";

import { DataQueryCache } from "./cache.js";
import { DataActorCoordinator } from "./coordinator.js";
import { deferred, mutation, query, success } from "./data.test-data.js";
import { MemoryDataInvalidationBus } from "./invalidation-bus.js";
import { DataSourceRegistry } from "./registry.js";
import {
  DataActorDisposition,
  DataErrorCode,
  DataResultStatus,
  type DataFailureResult,
  type DataOptimisticLease
} from "./types.js";

it("caches fresh queries and serves stale last-known-good data while offline", async () => {
  const registry = new DataSourceRegistry();
  const handler = vi.fn(async () => success());
  registry.register("customers.search", handler);
  let now = "2026-08-25T12:00:00.500Z";
  let online = true;
  const coordinator = new DataActorCoordinator({
    clock: { now: () => now },
    online: { isOnline: () => online },
    registry,
    sourceId: "tab-a"
  });

  const network = await coordinator.execute("results", query());
  const fresh = await coordinator.execute("results", query("request-2"));
  now = "2026-08-25T12:00:02.000Z";
  online = false;
  const offline = await coordinator.execute("results", query("request-3"));

  expect(network.disposition).toBe(DataActorDisposition.Committed);
  expect(fresh.disposition).toBe(DataActorDisposition.Cache);
  expect(offline.disposition).toBe(DataActorDisposition.Cache);
  expect(handler).toHaveBeenCalledOnce();
});

it("aborts a superseded request and discards its late result by actor identity", async () => {
  const first = deferred<ReturnType<typeof success>>();
  const registry = new DataSourceRegistry();
  let firstSignal: AbortSignal | undefined;
  registry.register("customers.search", ({ request, signal }) => {
    if (request.requestId === "request-1") {
      firstSignal = signal;
      return first.promise;
    }
    return Promise.resolve(success("revision-2"));
  });
  const coordinator = new DataActorCoordinator({ registry, sourceId: "tab-a" });

  const stalePromise = coordinator.execute("results", query());
  const current = await coordinator.execute("results", query("request-2", { query: "Grace" }));
  first.resolve(success("revision-stale"));
  const stale = await stalePromise;

  expect(firstSignal?.aborted).toBe(true);
  expect(current.result.revision).toBe("revision-2");
  expect(stale.disposition).toBe(DataActorDisposition.Discarded);
  expect((stale.result as DataFailureResult).error.code).toBe(DataErrorCode.Superseded);
});

it("retries only safe failures and never retries conflicts", async () => {
  const registry = new DataSourceRegistry();
  let attempts = 0;
  registry.register("customers.search", async () => {
    attempts += 1;
    return attempts < 3
      ? failure(DataResultStatus.Unavailable, DataErrorCode.Unavailable)
      : success();
  });
  registry.register("customers.update", async () =>
    failure(DataResultStatus.Conflict, DataErrorCode.Conflict)
  );
  const rollback = vi.fn();
  const coordinator = new DataActorCoordinator({
    optimistic: { apply: () => ({ commit: vi.fn(), rollback }) },
    registry,
    retry: { baseDelayMs: 0, jitterRatio: 0, maxAttempts: 3, maxDelayMs: 0 },
    sourceId: "tab-a"
  });

  const recovered = await coordinator.execute("results", query());
  const conflict = await coordinator.execute("editor", mutation());

  expect(recovered.attempts).toBe(3);
  expect(recovered.result.status).toBe(DataResultStatus.Success);
  expect(conflict.attempts).toBe(1);
  expect(rollback).toHaveBeenCalledOnce();
});

it("commits optimistic mutations and invalidates matching caches across contexts", async () => {
  const { cacheA, cacheB, lease, tabA, tabB } = crossContextCoordinators();
  await tabA.execute("results", query());
  await tabB.execute("results", query());

  const result = await tabA.execute("editor", mutation());

  expect(result.result.status).toBe(DataResultStatus.Success);
  expect(lease.commit).toHaveBeenCalledOnce();
  expect(lease.rollback).not.toHaveBeenCalled();
  expect(cacheA.size).toBe(0);
  expect(cacheB.size).toBe(0);
  tabA.dispose();
  tabB.dispose();
});

function crossContextCoordinators() {
  const bus = new MemoryDataInvalidationBus();
  const cacheA = new DataQueryCache();
  const cacheB = new DataQueryCache();
  const registry = new DataSourceRegistry();
  registry.register("customers.search", async () => success());
  registry.register("customers.update", async () => success("revision-2"));
  const lease: DataOptimisticLease = { commit: vi.fn(), rollback: vi.fn() };
  const tabA = new DataActorCoordinator({
    cache: cacheA,
    invalidationBus: bus,
    optimistic: { apply: () => lease },
    registry,
    sourceId: "tab-a"
  });
  const tabB = new DataActorCoordinator({
    cache: cacheB,
    invalidationBus: bus,
    registry,
    sourceId: "tab-b"
  });
  return { cacheA, cacheB, lease, tabA, tabB };
}

it("maps invalid, unknown, thrown, and canceled work to safe bounded failures", async () => {
  const registry = new DataSourceRegistry();
  registry.register("customers.search", async () => {
    throw new Error("provider secret");
  });
  const coordinator = new DataActorCoordinator({
    registry,
    retry: { baseDelayMs: 0, maxAttempts: 1, maxDelayMs: 0 },
    sourceId: "tab-a"
  });
  const invalid = await coordinator.execute("results", { ...query(), requestId: "__proto__" });
  const unknown = await coordinator.execute("results", {
    ...query(),
    operationId: "customers.unknown"
  });
  const thrown = await coordinator.execute("results", query("request-3"));
  const controller = new AbortController();
  controller.abort();
  const canceled = await coordinator.execute(
    "results",
    query("request-4", { query: "Canceled" }),
    controller.signal
  );

  expect((invalid.result as DataFailureResult).error.code).toBe(DataErrorCode.InvalidRequest);
  expect((unknown.result as DataFailureResult).error.code).toBe(
    DataErrorCode.OperationNotRegistered
  );
  expect(JSON.stringify(thrown)).not.toContain("provider secret");
  expect(canceled.result.status).toBe(DataResultStatus.Canceled);
});

it("aborts a timed-out adapter attempt and returns a safe timeout result", async () => {
  vi.useFakeTimers();
  let signal: AbortSignal | undefined;
  const registry = new DataSourceRegistry();
  registry.register("customers.search", async (invocation) => {
    signal = invocation.signal;
    await new Promise(() => undefined);
    return success();
  });
  const coordinator = new DataActorCoordinator({
    registry,
    retry: { maxAttempts: 1 },
    sourceId: "tab-a"
  });
  const pending = coordinator.execute("results", { ...query(), timeoutMs: 5 });
  await vi.advanceTimersByTimeAsync(5);

  await expect(pending).resolves.toMatchObject({
    attempts: 1,
    result: { status: DataResultStatus.Timeout }
  });
  expect(signal?.aborted).toBe(true);
  vi.useRealTimers();
});

function failure(status: DataFailureResult["status"], code: DataErrorCode): DataFailureResult {
  return { error: { code, messageKey: `data.${code}` }, status };
}
