import { DatabaseSync } from "node:sqlite";

import {
  ControlPlaneOperationStatus,
  EncryptedControlPlaneRecovery,
  EncryptedRecoveryStatus,
  type EncryptedBackupEnvelope,
  SqliteControlPlaneRecoverySource,
  SqliteControlPlaneStore
} from "@unislang/unifold-control-plane";

import { percentile } from "./profile-statistics.js";

const WORKLOAD_SIZE = 1_000;
const PROFILE_SAMPLES = 5;
const COMMIT_P95_LIMIT_MILLISECONDS = 2_000;
const OUTBOX_P95_LIMIT_MILLISECONDS = 500;
const RECOVERY_P95_LIMIT_MILLISECONDS = 2_000;

interface DurabilitySample {
  readonly commitMilliseconds: number;
  readonly exactCommit: boolean;
  readonly exactOutbox: boolean;
  readonly exactRecovery: boolean;
  readonly outboxMilliseconds: number;
  readonly recoveryMilliseconds: number;
}

export async function measureControlPlaneDurabilityPerformance(sampleCount = PROFILE_SAMPLES) {
  const samples: DurabilitySample[] = [];
  for (let sample = 0; sample < sampleCount; sample += 1) {
    samples.push(await measureSample(sample));
  }
  const commits = statistics(samples.map(({ commitMilliseconds }) => commitMilliseconds));
  const outbox = statistics(samples.map(({ outboxMilliseconds }) => outboxMilliseconds));
  const recovery = statistics(samples.map(({ recoveryMilliseconds }) => recoveryMilliseconds));
  const verified = {
    commits: samples.every(({ exactCommit }) => exactCommit),
    outbox: samples.every(({ exactOutbox }) => exactOutbox),
    recovery: samples.every(({ exactRecovery }) => exactRecovery)
  };
  return {
    commits,
    gates: durabilityGates(commits, outbox, recovery, verified),
    outbox,
    recovery,
    sampleCount,
    verified,
    workloadSize: WORKLOAD_SIZE
  };
}

async function measureSample(sample: number): Promise<DurabilitySample> {
  const database = new DatabaseSync(":memory:");
  const store = new SqliteControlPlaneStore({
    database,
    maxDocumentsPerTenant: WORKLOAD_SIZE,
    realtimeRetention: WORKLOAD_SIZE
  });
  try {
    const commits = await measureCommits(store, sample);
    const outbox = await measureOutboxDrain(store, sample);
    const recovery = await measureEncryptedRecovery(database, sample);
    return { ...commits, ...outbox, ...recovery };
  } finally {
    database.close();
  }
}

async function measureEncryptedRecovery(database: DatabaseSync, sample: number) {
  const fixture = await encryptedRecoveryFixture(database, sample);
  const backupId = `benchmark-backup-${sample}`;
  const started = performance.now();
  const created = await fixture.recovery.createBackup({
    backupId,
    createdAt: "2026-01-01T00:00:00.000Z",
    tenantId: "benchmark-tenant"
  });
  const drilled = await fixture.recovery.runRestoreDrill({
    backupId,
    drilledAt: "2026-01-01T00:01:00.000Z",
    tenantId: "benchmark-tenant"
  });
  const recoveryMilliseconds = performance.now() - started;
  const exactRecovery = [
    created.status === EncryptedRecoveryStatus.Succeeded,
    drilled.status === EncryptedRecoveryStatus.Succeeded,
    fixture.state.checkpointed
  ].every(Boolean);
  return { exactRecovery, recoveryMilliseconds };
}

async function encryptedRecoveryFixture(database: DatabaseSync, sample: number) {
  const key = await crypto.subtle.generateKey({ length: 256, name: "AES-GCM" }, false, [
    "encrypt",
    "decrypt"
  ]);
  const envelopes = new Map<string, EncryptedBackupEnvelope>();
  const state = { checkpointed: false };
  const recovery = new EncryptedControlPlaneRecovery({
    checkpoint: {
      recordLastKnownGood: async () => {
        state.checkpointed = true;
      }
    },
    keys: {
      activeKey: async () => ({ key, keyId: `benchmark-key-${sample}` }),
      resolveKey: async () => key
    },
    nonce: () => Uint8Array.from({ length: 12 }, (_value, index) => index + sample + 1),
    source: new SqliteControlPlaneRecoverySource({ database }),
    vault: {
      read: async (_tenantId, backupId) => envelopes.get(backupId),
      write: async (envelope) => void envelopes.set(envelope.backupId, envelope)
    }
  });
  return { recovery, state };
}

async function measureCommits(store: SqliteControlPlaneStore, sample: number) {
  const results = [];
  const started = performance.now();
  for (let index = 0; index < WORKLOAD_SIZE; index += 1) {
    results.push(await store.commitDocument(commitCommand(sample, index)));
  }
  const commitMilliseconds = performance.now() - started;
  const exactCommit = exactCommitResults(store, results);
  return { commitMilliseconds, exactCommit };
}

function exactCommitResults(
  store: SqliteControlPlaneStore,
  results: readonly Awaited<ReturnType<SqliteControlPlaneStore["commitDocument"]>>[]
): boolean {
  const revisions = results.every((result, index) =>
    [
      result.status === ControlPlaneOperationStatus.Succeeded,
      result.value?.revision === `revision-${index + 1}`
    ].every(Boolean)
  );
  return [
    revisions,
    store.auditEntries("benchmark-tenant").length === WORKLOAD_SIZE,
    store.realtimeMessages("benchmark-tenant").length === WORKLOAD_SIZE
  ].every(Boolean);
}

async function measureOutboxDrain(store: SqliteControlPlaneStore, sample: number) {
  const sequences: number[] = [];
  const started = performance.now();
  for (let batch = 0; batch < WORKLOAD_SIZE / 100; batch += 1) {
    const entries = await store.leaseOutbox(leaseCommand(sample, batch));
    const leased = entries.map(({ message }) => message.sequence);
    sequences.push(...leased);
    await store.acknowledgeOutbox(acknowledgement(sample, batch, leased));
  }
  const outboxMilliseconds = performance.now() - started;
  const remaining = await store.leaseOutbox(leaseCommand(sample, 10));
  const exactOutbox = exactSequences(sequences) && remaining.length === 0;
  return { exactOutbox, outboxMilliseconds };
}

function commitCommand(sample: number, index: number) {
  return {
    actorId: "benchmark-actor",
    correlationId: `durability-${sample}`,
    document: { index, sample },
    objectId: `document-${index}`,
    occurredAt: "2026-01-01T00:00:00.000Z",
    requestId: `request-${sample}-${index}`,
    tenantId: "benchmark-tenant"
  };
}

function leaseCommand(sample: number, batch: number) {
  return {
    leaseUntil: "2026-01-01T00:01:00.000Z",
    leasedAt: "2026-01-01T00:00:00.000Z",
    limit: 100,
    tenantId: "benchmark-tenant",
    workerId: `worker-${sample}-${batch}`
  };
}

function acknowledgement(sample: number, batch: number, sequences: readonly number[]) {
  return {
    acknowledgedAt: "2026-01-01T00:00:30.000Z",
    sequences,
    tenantId: "benchmark-tenant",
    workerId: `worker-${sample}-${batch}`
  };
}

function exactSequences(sequences: readonly number[]): boolean {
  return sequences.every((sequence, index) => sequence === index + 1);
}

function durabilityGates(
  commits: ReturnType<typeof statistics>,
  outbox: ReturnType<typeof statistics>,
  recovery: ReturnType<typeof statistics>,
  verified: { readonly commits: boolean; readonly outbox: boolean; readonly recovery: boolean }
) {
  return [
    gate(
      "1k SQLite atomic control-plane commits",
      commits.p95Milliseconds,
      COMMIT_P95_LIMIT_MILLISECONDS,
      verified.commits
    ),
    gate(
      "1k SQLite outbox lease and acknowledgement",
      outbox.p95Milliseconds,
      OUTBOX_P95_LIMIT_MILLISECONDS,
      verified.outbox
    ),
    gate(
      "1k-document encrypted SQLite backup and restore drill",
      recovery.p95Milliseconds,
      RECOVERY_P95_LIMIT_MILLISECONDS,
      verified.recovery
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
