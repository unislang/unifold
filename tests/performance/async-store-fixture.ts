import {
  DataClassification,
  UiStoreAccess,
  UiStoreInitialDataPolicy,
  UiStoreOwnership,
  UiStorePersistence,
  UiStoreSchemaVersion,
  UiStoreSourceKind,
  type UiStoreDefinition
} from "@unislang/unifold-contracts";
import {
  UnifoldApplicationMountStatus,
  connectAsyncStore,
  createAsyncMemoryStoreAdapter,
  mountUnifoldApplicationAsync,
  type UiAsyncMemoryStoreAdapter,
  type UiAsyncStoreSession,
  type UnifoldApplicationPort
} from "@unislang/unifold";

import { percentile } from "./profile-statistics.js";

const OPERATION_COUNT = 1_000;
const PROFILE_SAMPLES = 5;
const COMMIT_P95_LIMIT_MILLISECONDS = 2_000;
const PROJECTION_P95_LIMIT_MILLISECONDS = 5_000;

interface Sample {
  readonly commitsExact: boolean;
  readonly commitsMilliseconds: number;
  readonly projectionsExact: boolean;
  readonly projectionsMilliseconds: number;
}

export async function measureAsyncStorePerformance(sampleCount = PROFILE_SAMPLES) {
  const samples: Sample[] = [];
  for (let index = 0; index < sampleCount; index += 1) samples.push(await measureSample());
  const commits = statistics(samples.map(({ commitsMilliseconds }) => commitsMilliseconds));
  const projections = statistics(
    samples.map(({ projectionsMilliseconds }) => projectionsMilliseconds)
  );
  const verified = {
    commits: samples.every(({ commitsExact }) => commitsExact),
    projections: samples.every(({ projectionsExact }) => projectionsExact)
  };
  return {
    commits,
    gates: gates(commits, projections, verified),
    operationCount: OPERATION_COUNT,
    projections,
    sampleCount,
    verified
  };
}

async function measureSample(): Promise<Sample> {
  const commits = await measureCommits();
  const projections = await measureProjections();
  return {
    commitsExact: commits.exact,
    commitsMilliseconds: commits.milliseconds,
    projectionsExact: projections.exact,
    projectionsMilliseconds: projections.milliseconds
  };
}

async function measureCommits() {
  const adapter = memoryAdapter();
  const connection = await connectAsyncStore(storeDefinition(), adapter, {
    authorization: allowAll()
  });
  const session = connection.session;
  if (session === undefined) throw new Error("The benchmark store did not connect.");
  const started = performance.now();
  await commitOperations(session);
  const milliseconds = performance.now() - started;
  const exact = session.snapshot?.revision === `memory-${OPERATION_COUNT}`;
  session.dispose();
  return { exact, milliseconds };
}

async function commitOperations(session: UiAsyncStoreSession): Promise<void> {
  for (let index = 0; index < OPERATION_COUNT; index += 1) {
    const current = requireBenchmarkSnapshot(session);
    const result = await session.commit({
      expectedRevision: current.revision,
      idempotencyKey: `benchmark-commit-${index}`,
      path: "/name",
      value: `Name-${index}`
    });
    requireBenchmarkCommit(result.status);
  }
}

function requireBenchmarkSnapshot(session: UiAsyncStoreSession) {
  const snapshot = session.snapshot;
  if (snapshot === undefined) throw new Error("The benchmark snapshot is missing.");
  return snapshot;
}

function requireBenchmarkCommit(status: string): void {
  if (status !== "committed") throw new Error("The benchmark commit failed.");
}

async function measureProjections() {
  const counted = countedAdapter();
  const application = await mountedApplication(counted.adapter);
  const started = performance.now();
  publishSnapshots(counted.adapter);
  await waitForRevision(application, OPERATION_COUNT);
  const milliseconds = performance.now() - started;
  const exact = projectionExact(application, counted.commits());
  application.dispose();
  return { exact, milliseconds };
}

async function mountedApplication(adapter: UiAsyncMemoryStoreAdapter) {
  const result = await mountUnifoldApplicationAsync(
    storeDocument(),
    document.createElement("div"),
    {
      asyncStoreAdapters: { customer: { adapter, authorization: allowAll() } }
    }
  );
  if (result.status === UnifoldApplicationMountStatus.Rejected) {
    throw new Error(
      `The benchmark application did not mount: ${JSON.stringify(result.diagnostics)}`
    );
  }
  return result.application;
}

function publishSnapshots(adapter: UiAsyncMemoryStoreAdapter): void {
  for (let index = 1; index <= OPERATION_COUNT; index += 1) {
    adapter.publish({
      dataVersion: "2.1.0",
      revision: `external-${index}`,
      value: { name: `Name-${index}` }
    });
  }
}

async function waitForRevision(
  application: UnifoldApplicationPort,
  revision: number
): Promise<void> {
  const deadline = performance.now() + PROJECTION_P95_LIMIT_MILLISECONDS * 2;
  while (application.runtime.revision < revision) {
    if (performance.now() > deadline) throw new Error("Async projection benchmark timed out.");
    await Promise.resolve();
  }
}

function projectionExact(application: UnifoldApplicationPort, commits: number): boolean {
  return [
    application.runtime.revision === OPERATION_COUNT,
    application.runtime.getSnapshot("name").control?.value === `Name-${OPERATION_COUNT}`,
    commits === 0
  ].every(Boolean);
}

function countedAdapter() {
  const memory = memoryAdapter();
  let count = 0;
  const adapter: UiAsyncMemoryStoreAdapter = {
    commit: (command) => {
      count += 1;
      return memory.commit(command);
    },
    load: (signal) => memory.load(signal),
    publish: (snapshot) => memory.publish(snapshot),
    snapshot: () => memory.snapshot(),
    subscribe: (listener) => subscribeMemory(memory, listener),
    version: memory.version
  };
  return { adapter, commits: () => count };
}

function subscribeMemory(
  adapter: UiAsyncMemoryStoreAdapter,
  listener: (snapshot: Parameters<UiAsyncMemoryStoreAdapter["publish"]>[0]) => void
): () => void {
  const subscribe = adapter.subscribe;
  if (subscribe === undefined) return () => undefined;
  return subscribe.call(adapter, listener);
}

function memoryAdapter(): UiAsyncMemoryStoreAdapter {
  return createAsyncMemoryStoreAdapter("2.1.0", {
    initialSnapshot: { dataVersion: "2.1.0", revision: "revision-0", value: { name: "Ada" } }
  });
}

function allowAll() {
  return { decide: async () => true };
}

function storeDocument() {
  return {
    $schema: "https://schemas.unifold.org/ui-document/1.0/schema.json",
    catalog: { name: "unifold-core", version: "1.0.0" },
    compositions: [],
    id: "async-store-benchmark",
    jsonUiProfile: {
      name: "unifold-jsonui",
      upstream: "5401b3d4900ca3032c108d6db00e8a819f4b28e9",
      version: "1.0.0"
    },
    revision: "1",
    schemaVersion: "1.0.0",
    stores: [storeDefinition()],
    view: { $comp: "TextField", id: "name", path: "/name", store: "customer" }
  };
}

function storeDefinition(): UiStoreDefinition {
  return {
    access: UiStoreAccess.ReadWriteDraft,
    classification: DataClassification.Internal,
    id: "customer",
    initialData: UiStoreInitialDataPolicy.Required,
    maxBytes: 65_536,
    migrations: { maximum: "2.9.0", minimum: "2.0.0" },
    ownership: UiStoreOwnership.Host,
    persistence: UiStorePersistence.Session,
    schema: {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      additionalProperties: false,
      properties: { name: { type: "string" } },
      required: ["name"],
      type: "object"
    },
    schemaVersion: UiStoreSchemaVersion.Version1,
    source: { kind: UiStoreSourceKind.Host }
  };
}

function gates(
  commits: ReturnType<typeof statistics>,
  projections: ReturnType<typeof statistics>,
  verified: { readonly commits: boolean; readonly projections: boolean }
) {
  return [
    gate(
      "1k authorized async store commits",
      commits.p95Milliseconds,
      COMMIT_P95_LIMIT_MILLISECONDS,
      verified.commits
    ),
    gate(
      "1k mounted external store projections",
      projections.p95Milliseconds,
      PROJECTION_P95_LIMIT_MILLISECONDS,
      verified.projections
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
