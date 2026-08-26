import { DataClassification } from "@unislang/unifold-contracts";

import {
  DataOfflineBehavior,
  DataOperationKind,
  DataProtocolVersion,
  DataResultStatus,
  type DataMutationRequest,
  type DataQueryRequest,
  type DataSuccessResult
} from "./types.js";

export function query(
  requestId = "request-1",
  variables: DataQueryRequest["variables"] = { query: "Ada" }
): DataQueryRequest {
  return {
    cache: { freshForMs: 1_000, offline: DataOfflineBehavior.LastKnownGood, retainForMs: 60_000 },
    correlationId: "correlation-1",
    kind: DataOperationKind.Query,
    operationId: "customers.search",
    page: { limit: 50 },
    protocolVersion: DataProtocolVersion.Version1,
    requestId,
    variables
  };
}

export function mutation(requestId = "mutation-1"): DataMutationRequest {
  return {
    correlationId: "correlation-1",
    expectedRevision: "revision-1",
    idempotencyKey: "idempotency-1",
    invalidateTags: ["customers"],
    kind: DataOperationKind.Mutation,
    operationId: "customers.update",
    protocolVersion: DataProtocolVersion.Version1,
    requestId,
    variables: { id: "customer-1", name: "Grace" }
  };
}

export function success(revision = "revision-1"): DataSuccessResult {
  return {
    classification: DataClassification.Internal,
    data: { customers: [{ id: "customer-1", name: "Ada" }] },
    invalidationTags: ["customers"],
    nextCursor: "cursor-2",
    receivedAt: "2026-08-25T12:00:00.000Z",
    revision,
    status: DataResultStatus.Success
  };
}

export function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((next) => {
    resolve = next;
  });
  return { promise, resolve };
}
