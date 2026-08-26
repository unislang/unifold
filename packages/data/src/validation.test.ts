import { DataClassification } from "@unislang/unifold-contracts";
import { expect, it } from "vitest";

import {
  DataOfflineBehavior,
  DataOperationKind,
  DataProtocolVersion,
  DataResultStatus,
  type DataQueryRequest
} from "./types.js";
import { dataRequestErrors, isDataRequest, isDataResult } from "./validation.js";

it("accepts a bounded query and safe result", () => {
  expect(isDataRequest(query())).toBe(true);
  expect(
    isDataResult({
      classification: DataClassification.Internal,
      data: { customers: [] },
      invalidationTags: ["customers"],
      receivedAt: "2026-08-25T12:00:00.000Z",
      revision: "revision-1",
      status: DataResultStatus.Success
    })
  ).toBe(true);
});

it("rejects unsafe identities, cursor ambiguity, and unbounded request JSON", () => {
  expect(dataRequestErrors({ ...query(), requestId: "__proto__" })).toContain("identity");
  expect(dataRequestErrors({ ...query(), page: { after: "a", before: "b", limit: 10 } })).toContain(
    "page"
  );
  expect(dataRequestErrors({ ...query(), variables: { value: Number.NaN } })).toContain(
    "variables"
  );
  expect(
    dataRequestErrors({ ...query(), variables: JSON.parse('{"__proto__":{"polluted":true}}') })
  ).toContain("variables");
  expect(dataRequestErrors({ ...query(), extra: true })).toContain("unknown property");
  expect(dataRequestErrors({ ...query(), cache: { ...query().cache, extra: true } })).toContain(
    "cache"
  );
});

it("rejects malformed adapter results", () => {
  expect(isDataResult({ status: DataResultStatus.Success, data: [] })).toBe(false);
  expect(
    isDataResult({
      classification: DataClassification.Internal,
      data: [],
      invalidationTags: [],
      receivedAt: "2026-02-30T12:00:00.000Z",
      status: DataResultStatus.Success
    })
  ).toBe(false);
  expect(
    isDataResult({
      error: { code: "raw", messageKey: "safe", details: { value: Number.POSITIVE_INFINITY } },
      status: DataResultStatus.Unavailable
    })
  ).toBe(false);
});

function query(): DataQueryRequest {
  return {
    cache: { freshForMs: 1_000, offline: DataOfflineBehavior.LastKnownGood, retainForMs: 60_000 },
    correlationId: "correlation-1",
    kind: DataOperationKind.Query,
    operationId: "customers.search",
    page: { limit: 50 },
    protocolVersion: DataProtocolVersion.Version1,
    requestId: "request-1",
    variables: { query: "Ada" }
  };
}
