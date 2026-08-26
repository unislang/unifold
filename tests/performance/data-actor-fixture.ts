import { DataClassification, type JsonObject } from "@unislang/unifold-contracts";
import {
  DataActorCoordinator,
  DataActorDisposition,
  DataOfflineBehavior,
  DataOperationKind,
  DataProtocolVersion,
  DataQueryCache,
  DataResultStatus,
  DataSourceRegistry,
  type DataQueryRequest,
  type DataSuccessResult
} from "@unislang/unifold";

import { percentile } from "./profile-statistics.js";

const QUERY_COUNT = 1_000;
const CACHE_HIT_P95_LIMIT_MILLISECONDS = 250;
const INVALIDATION_P95_LIMIT_MILLISECONDS = 100;
const PROFILE_SAMPLES = 20;
const now = "2026-08-25T12:00:00.000Z";

interface CacheHitMeasurement {
  readonly cacheHits: number;
  readonly milliseconds: number;
}

interface InvalidationMeasurement {
  readonly milliseconds: number;
  readonly remaining: number;
  readonly removed: number;
}

export async function measureDataActorPerformance(sampleCount = PROFILE_SAMPLES) {
  const registry = new DataSourceRegistry();
  let handlerInvocations = 0;
  registry.register("customers.search", async ({ request }) => {
    handlerInvocations += 1;
    return result(Number(request.variables["index"]));
  });
  const coordinator = new DataActorCoordinator({
    cache: new DataQueryCache(QUERY_COUNT),
    clock: { now: () => now },
    registry,
    sourceId: "benchmark"
  });
  const requests = Array.from({ length: QUERY_COUNT }, (_, index) => request(index));
  await Promise.all(
    requests.map((candidate, index) => coordinator.execute(`source-${index}`, candidate))
  );
  const warmupInvocations = handlerInvocations;
  const cacheSamples: CacheHitMeasurement[] = [];
  const invalidationSamples: InvalidationMeasurement[] = [];
  for (let sample = 0; sample < sampleCount; sample += 1) {
    cacheSamples.push(await measureCacheHits(coordinator, requests, sample));
    invalidationSamples.push(measureInvalidation(requests));
  }
  coordinator.dispose();
  return evidence(cacheSamples, invalidationSamples, warmupInvocations, handlerInvocations);
}

async function measureCacheHits(
  coordinator: DataActorCoordinator,
  requests: readonly DataQueryRequest[],
  sample: number
): Promise<CacheHitMeasurement> {
  const started = performance.now();
  const resolutions = await Promise.all(
    requests.map((candidate, index) =>
      coordinator.execute(`source-${index}`, {
        ...candidate,
        requestId: `cache-${sample}-${index}`
      })
    )
  );
  return {
    cacheHits: resolutions.filter(({ disposition }) => disposition === DataActorDisposition.Cache)
      .length,
    milliseconds: performance.now() - started
  };
}

function measureInvalidation(requests: readonly DataQueryRequest[]): InvalidationMeasurement {
  const cache = new DataQueryCache(QUERY_COUNT);
  requests.forEach((candidate, index) => cache.set(candidate, result(index)));
  const started = performance.now();
  const removed = cache.invalidateTags(["customers"]);
  return { milliseconds: performance.now() - started, remaining: cache.size, removed };
}

function evidence(
  cacheSamples: readonly CacheHitMeasurement[],
  invalidationSamples: readonly InvalidationMeasurement[],
  warmupInvocations: number,
  finalInvocations: number
) {
  const cacheHits = statistics(cacheSamples.map(({ milliseconds }) => milliseconds));
  const invalidation = statistics(invalidationSamples.map(({ milliseconds }) => milliseconds));
  const exact = exactEvidence(
    cacheSamples,
    invalidationSamples,
    warmupInvocations,
    finalInvocations
  );
  return {
    cacheHits,
    gates: dataGates(cacheHits, invalidation, exact),
    handlerInvocations: finalInvocations,
    invalidation,
    queryCount: QUERY_COUNT,
    sampleCount: cacheSamples.length
  };
}

function exactEvidence(
  cacheSamples: readonly CacheHitMeasurement[],
  invalidationSamples: readonly InvalidationMeasurement[],
  warmupInvocations: number,
  finalInvocations: number
) {
  return {
    cache: cacheSamples.every(({ cacheHits }) => cacheHits === QUERY_COUNT),
    invalidation: invalidationSamples.every(({ remaining, removed }) =>
      [remaining === 0, removed === QUERY_COUNT].every(Boolean)
    ),
    noNetwork: [warmupInvocations === QUERY_COUNT, finalInvocations === warmupInvocations].every(
      Boolean
    )
  };
}

function dataGates(
  cacheHits: ReturnType<typeof statistics>,
  invalidation: ReturnType<typeof statistics>,
  exact: ReturnType<typeof exactEvidence>
) {
  return [
    gate(
      "1k cached data-actor resolutions",
      cacheHits.p95Milliseconds,
      CACHE_HIT_P95_LIMIT_MILLISECONDS,
      [exact.cache, exact.noNetwork].every(Boolean)
    ),
    gate(
      "1k-tag data cache invalidation",
      invalidation.p95Milliseconds,
      INVALIDATION_P95_LIMIT_MILLISECONDS,
      exact.invalidation
    )
  ];
}

function gate(name: string, actual: number, limit: number, exact: boolean) {
  return {
    actualP95Milliseconds: actual,
    exact,
    limitP95Milliseconds: limit,
    name,
    passed: actual <= limit && exact
  };
}

function statistics(samples: readonly number[]) {
  return {
    maximumMilliseconds: Math.max(...samples),
    p50Milliseconds: percentile(samples, 0.5),
    p95Milliseconds: percentile(samples, 0.95),
    p99Milliseconds: percentile(samples, 0.99)
  };
}

function request(index: number): DataQueryRequest {
  return {
    cache: { freshForMs: 60_000, offline: DataOfflineBehavior.LastKnownGood, retainForMs: 60_000 },
    correlationId: `correlation-${index}`,
    kind: DataOperationKind.Query,
    operationId: "customers.search",
    page: { after: `cursor-${index}`, limit: 50 },
    protocolVersion: DataProtocolVersion.Version1,
    requestId: `warm-${index}`,
    variables: { index }
  };
}

function result(index: number): DataSuccessResult {
  const data: JsonObject = { id: `customer-${index}`, name: `Customer ${index}` };
  return {
    classification: DataClassification.Internal,
    data,
    invalidationTags: ["customers"],
    receivedAt: now,
    revision: `revision-${index}`,
    status: DataResultStatus.Success
  };
}
