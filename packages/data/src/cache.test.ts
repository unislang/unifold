import { DataClassification } from "@unislang/unifold-contracts";
import { expect, it } from "vitest";

import { DataQueryCache, dataQueryKey } from "./cache.js";
import {
  DataOfflineBehavior,
  DataOperationKind,
  DataProtocolVersion,
  DataResultStatus,
  type DataQueryRequest,
  type DataSuccessResult
} from "./types.js";

it("normalizes query keys, invalidates tags, and evicts least-recently-used entries", () => {
  const cache = new DataQueryCache(2);
  const first = request("first", { a: 1, b: 2 });
  const equivalent = request("first", { b: 2, a: 1 });
  const second = request("second", { key: "second" });
  const third = request("third", { key: "third" });
  cache.set(first, result("revision-1", ["customers"]));

  expect(dataQueryKey(first)).not.toBe(dataQueryKey(equivalent));
  expect(cache.get(equivalent)?.revision).toBe("revision-1");
  cache.set(second, result("revision-2", ["orders"]));
  cache.get(first);
  cache.set(third, result("revision-3", ["reports"]));

  expect(cache.get(second)).toBeUndefined();
  expect(cache.size).toBe(2);
  expect(cache.invalidateTags(["customers"])).toBe(1);
  expect(cache.get(first)).toBeUndefined();
  expect(() => new DataQueryCache(0)).toThrow(RangeError);
});

it("expires retained data by the declared query policy", () => {
  let now = 0;
  const cache = new DataQueryCache(2, undefined, () => now);
  const target = request("expiring", {});
  cache.set(target, result("revision-1", []));
  now = 60_000;

  expect(cache.get(target)).toBeUndefined();
  expect(cache.size).toBe(0);
});

function request(requestId: string, variables: DataQueryRequest["variables"]): DataQueryRequest {
  return {
    cache: { freshForMs: 1_000, offline: DataOfflineBehavior.LastKnownGood, retainForMs: 60_000 },
    correlationId: "correlation",
    kind: DataOperationKind.Query,
    operationId: "customers.search",
    protocolVersion: DataProtocolVersion.Version1,
    requestId,
    variables
  };
}

function result(revision: string, invalidationTags: readonly string[]): DataSuccessResult {
  return {
    classification: DataClassification.Internal,
    data: [],
    invalidationTags,
    receivedAt: "2026-08-25T12:00:00.000Z",
    revision,
    status: DataResultStatus.Success
  };
}
