import {
  ControlPlaneCapability,
  ControlPlaneOperation,
  ControlPlaneOperationStatus,
  ControlPlaneProtocolVersion,
  createControlPlaneHttpClient,
  createControlPlaneHttpHandler,
  createControlPlaneRealtimeCursor,
  createReferenceControlPlane,
  type ControlPlaneGrant,
  type ControlPlaneTrustedSession
} from "@unislang/unifold-control-plane";

import { percentile } from "./profile-statistics.js";

const REQUEST_COUNT = 1_000;
const PROFILE_SAMPLES = 10;
const HTTP_P95_LIMIT_MILLISECONDS = 2_000;
const REALTIME_P95_LIMIT_MILLISECONDS = 500;
const endpoint = "https://control.example/v1/control-plane";

interface Sample {
  readonly exactReads: boolean;
  readonly exactRealtime: boolean;
  readonly httpMilliseconds: number;
  readonly realtimeMilliseconds: number;
}

export async function measureControlPlaneTransportPerformance(sampleCount = PROFILE_SAMPLES) {
  const samples: Sample[] = [];
  for (let sample = 0; sample < sampleCount; sample += 1) {
    samples.push(await measureSample(sample));
  }
  const http = statistics(samples.map(({ httpMilliseconds }) => httpMilliseconds));
  const realtime = statistics(samples.map(({ realtimeMilliseconds }) => realtimeMilliseconds));
  const verified = {
    reads: samples.every(({ exactReads }) => exactReads),
    realtime: samples.every(({ exactRealtime }) => exactRealtime)
  };
  return {
    gates: transportGates(http, realtime, verified),
    http,
    realtime,
    requestCount: REQUEST_COUNT,
    sampleCount,
    verified
  };
}

async function measureSample(sample: number): Promise<Sample> {
  const read = await measureHttpReads(sample);
  const realtime = await measureRealtimeResume(sample);
  return {
    exactReads: read.exact,
    exactRealtime: realtime.exact,
    httpMilliseconds: read.milliseconds,
    realtimeMilliseconds: realtime.milliseconds
  };
}

async function measureHttpReads(sample: number) {
  const reference = referenceControlPlane();
  const seeded = await commit(reference.service, sample, 0);
  const client = httpClient(reference.service);
  const started = performance.now();
  const revisions = await readRevisions(client, sample);
  const milliseconds = performance.now() - started;
  const exact = [
    seeded.status === ControlPlaneOperationStatus.Succeeded,
    revisions.every((revision) => revision === "revision-1"),
    reference.store.auditEntries(session.tenantId).length === REQUEST_COUNT + 1
  ].every(Boolean);
  return { exact, milliseconds };
}

async function readRevisions(
  client: ReturnType<typeof httpClient>,
  sample: number
): Promise<(string | undefined)[]> {
  const revisions: (string | undefined)[] = [];
  for (let index = 0; index < REQUEST_COUNT; index += 1) {
    const result = await client.readDocument({
      ...requestMetadata(sample, index),
      objectId: "benchmark-document",
      operation: ControlPlaneOperation.DocumentRead
    });
    revisions.push(result.value?.revision);
  }
  return revisions;
}

async function measureRealtimeResume(sample: number) {
  const reference = referenceControlPlane();
  await seedRealtimeHistory(reference.service, sample);
  const cursor = createControlPlaneRealtimeCursor(httpClient(reference.service));
  const started = performance.now();
  const result = await cursor.poll(requestMetadata(sample, REQUEST_COUNT + 1));
  const milliseconds = performance.now() - started;
  const messages = result.value === undefined ? [] : result.value.messages;
  const exact = exactRealtimeResult(result.status, messages, cursor.afterSequence);
  return { exact, milliseconds };
}

async function seedRealtimeHistory(
  service: ReturnType<typeof referenceControlPlane>["service"],
  sample: number
): Promise<void> {
  let expectedRevision: string | undefined;
  for (let index = 0; index < REQUEST_COUNT; index += 1) {
    const result = await commit(service, sample, index, expectedRevision);
    expectedRevision = result.value?.revision;
  }
}

function exactRealtimeResult(
  status: ControlPlaneOperationStatus,
  messages: readonly { readonly sequence: number }[],
  cursor: number
): boolean {
  return [
    status === ControlPlaneOperationStatus.Succeeded,
    messages.length === REQUEST_COUNT,
    messages[0]?.sequence === 1,
    messages.at(-1)?.sequence === REQUEST_COUNT,
    cursor === REQUEST_COUNT
  ].every(Boolean);
}

function referenceControlPlane() {
  return createReferenceControlPlane({
    clock: { now: () => "2026-08-25T12:00:00.000Z" },
    grants,
    realtimeRetention: REQUEST_COUNT,
    sessions: { "benchmark-token": session }
  });
}

function httpClient(service: ReturnType<typeof referenceControlPlane>["service"]) {
  const handler = createControlPlaneHttpHandler(service);
  return createControlPlaneHttpClient(endpoint, {
    fetch: async (input, init) => handler(new Request(input, init))
  });
}

function commit(
  service: ReturnType<typeof referenceControlPlane>["service"],
  sample: number,
  index: number,
  expectedRevision?: string
) {
  return service.commitDocument({
    ...requestMetadata(sample, index),
    document: { id: "benchmark-document", sample, value: index },
    ...(expectedRevision === undefined ? {} : { expectedRevision }),
    objectId: "benchmark-document",
    operation: ControlPlaneOperation.DocumentCommit
  });
}

function requestMetadata(sample: number, index: number) {
  return {
    correlationId: `transport-${sample}`,
    protocolVersion: ControlPlaneProtocolVersion.Version1,
    requestId: `request-${sample}-${index}`,
    sessionToken: "benchmark-token"
  } as const;
}

const session: ControlPlaneTrustedSession = Object.freeze({
  actorId: "benchmark-actor",
  capabilities: Object.freeze([
    ControlPlaneCapability.DocumentCommit,
    ControlPlaneCapability.DocumentRead,
    ControlPlaneCapability.RealtimeResume
  ]),
  sessionId: "benchmark-session",
  tenantId: "benchmark-tenant"
});

const grants: readonly ControlPlaneGrant[] = Object.freeze([
  {
    actorId: session.actorId,
    capability: ControlPlaneCapability.DocumentCommit,
    resourceId: "benchmark-document",
    tenantId: session.tenantId
  },
  {
    actorId: session.actorId,
    capability: ControlPlaneCapability.DocumentRead,
    resourceId: "benchmark-document",
    tenantId: session.tenantId
  },
  {
    actorId: session.actorId,
    capability: ControlPlaneCapability.RealtimeResume,
    resourceId: `tenant:${session.tenantId}`,
    tenantId: session.tenantId
  }
]);

function transportGates(
  http: ReturnType<typeof statistics>,
  realtime: ReturnType<typeof statistics>,
  verified: { readonly reads: boolean; readonly realtime: boolean }
) {
  return [
    gate(
      "1k bounded Fetch control-plane reads",
      http.p95Milliseconds,
      HTTP_P95_LIMIT_MILLISECONDS,
      verified.reads
    ),
    gate(
      "1k-message Fetch realtime resume",
      realtime.p95Milliseconds,
      REALTIME_P95_LIMIT_MILLISECONDS,
      verified.realtime
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
