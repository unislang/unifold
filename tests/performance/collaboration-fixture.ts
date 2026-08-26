import type { JsonObject } from "@unislang/unifold-contracts";
import {
  CollaborationActorType,
  CollaborationCapability,
  CollaborationOperation,
  CollaborationPatchOperationType,
  CollaborationProtocolVersion,
  CollaborationStatus,
  ReferenceCollaborationService,
  type CollaborationActorContext,
  type CollaborationResult,
  type CollaborationSubmitProposalRequest
} from "@unislang/unifold-collaboration";

import { percentile } from "./profile-statistics.js";

const COMMIT_COUNT = 1_000;
const COMMIT_P95_LIMIT_MILLISECONDS = 1_000;
const REBASE_P95_LIMIT_MILLISECONDS = 100;
const PROFILE_SAMPLES = 20;

interface Sample {
  readonly commitsAccepted: boolean;
  readonly commitMilliseconds: number;
  readonly exactDocument: boolean;
  readonly exactSequence: boolean;
  readonly rebaseAccepted: boolean;
  readonly rebaseMilliseconds: number;
  readonly rebased: boolean;
}

export function measureCollaborationPerformance(sampleCount = PROFILE_SAMPLES) {
  const samples = Array.from({ length: sampleCount }, (_, sample) => measureSample(sample));
  const commits = statistics(samples.map(({ commitMilliseconds }) => commitMilliseconds));
  const rebase = statistics(samples.map(({ rebaseMilliseconds }) => rebaseMilliseconds));
  const exact = exactEvidence(samples);
  return {
    commitCount: COMMIT_COUNT,
    commits,
    gates: collaborationGates(commits, rebase, exact),
    rebase,
    sampleCount,
    verified: exact
  };
}

function measureSample(sample: number): Sample {
  const service = collaborationService();
  const originalBase = requiredHead(service).revision;
  const commitMilliseconds = commitHistory(service, sample, originalBase);
  const { milliseconds: rebaseMilliseconds, result } = measureRebase(service, sample, originalBase);
  const head = requiredHead(service);
  return {
    commitsAccepted: true,
    commitMilliseconds,
    exactDocument: expectedDocument(head.document),
    exactSequence: head.sequence === COMMIT_COUNT + 2,
    rebaseAccepted: result.status === CollaborationStatus.Accepted,
    rebaseMilliseconds,
    rebased: service.proposal(`stale-${sample}`)?.rebased === true
  };
}

function commitHistory(
  service: ReferenceCollaborationService,
  sample: number,
  originalBase: string
): number {
  let currentBase = originalBase;
  const started = performance.now();
  for (let index = 0; index < COMMIT_COUNT; index += 1) {
    currentBase = requiredRevision(
      service.execute(proposal(sample, index, currentBase), benchmarkActor)
    );
  }
  return performance.now() - started;
}

function measureRebase(
  service: ReferenceCollaborationService,
  sample: number,
  baseRevision: string
) {
  const started = performance.now();
  const result = service.execute(staleProposal(sample, baseRevision), benchmarkActor);
  return { milliseconds: performance.now() - started, result };
}

function expectedDocument(document: JsonObject): boolean {
  const view = document["view"];
  if (!isJsonObjectValue(view)) return false;
  return [view["title"] === `Title ${COMMIT_COUNT - 1}`, view["help"] === "Rebased"].every(Boolean);
}

function isJsonObjectValue(value: unknown): value is JsonObject {
  return [value !== null, typeof value === "object", !Array.isArray(value)].every(Boolean);
}

const benchmarkActor: CollaborationActorContext = Object.freeze({
  actorId: "benchmark-author",
  actorType: CollaborationActorType.Automation,
  capabilities: Object.freeze([CollaborationCapability.Propose]),
  tenantId: "benchmark-tenant"
});

function collaborationService(): ReferenceCollaborationService {
  return new ReferenceCollaborationService({
    clock: { now: () => new Date("2026-08-25T12:00:00.000Z") },
    initialDocument: {
      id: "benchmark-document",
      revision: "authored",
      schemaVersion: "1.0.0",
      view: { help: "Original", id: "root", title: "Original", type: "Box" }
    },
    tenantId: benchmarkActor.tenantId,
    validation: { validate: () => [] }
  });
}

function proposal(
  sample: number,
  index: number,
  baseRevision: string
): CollaborationSubmitProposalRequest {
  return request(sample, index, baseRevision, "/view/title", `Title ${index}`);
}

function staleProposal(sample: number, baseRevision: string): CollaborationSubmitProposalRequest {
  return request(sample, COMMIT_COUNT, baseRevision, "/view/help", "Rebased", `stale-${sample}`);
}

function request(
  sample: number,
  index: number,
  baseRevision: string,
  path: string,
  value: string,
  proposalId = `proposal-${sample}-${index}`
): CollaborationSubmitProposalRequest {
  return {
    affectedIds: ["root"],
    baseRevision,
    branchId: "main",
    correlationId: `correlation-${sample}-${index}`,
    idempotencyKey: `idempotency-${sample}-${index}`,
    intent: "Benchmark collaboration revision",
    operation: CollaborationOperation.Propose,
    operations: [{ op: CollaborationPatchOperationType.Replace, path, value }],
    proposalId,
    protocolVersion: CollaborationProtocolVersion.Version1,
    requestId: `request-${sample}-${index}`
  };
}

function requiredHead(service: ReferenceCollaborationService) {
  const head = service.head("main");
  if (head === undefined) throw new Error("Expected the main collaboration head.");
  return head;
}

function requiredRevision(result: CollaborationResult): string {
  if (result.status !== CollaborationStatus.Accepted) {
    throw new Error(`Collaboration commit failed: ${JSON.stringify(result)}`);
  }
  return revisionValue(requiredValue(result));
}

function requiredValue(result: CollaborationResult): JsonObject {
  if (result.value === undefined) throw new Error("Expected an accepted revision value.");
  return result.value as JsonObject;
}

function revisionValue(value: JsonObject): string {
  const revision = value["revision"];
  if (typeof revision !== "string") throw new Error("Expected an accepted revision value.");
  return revision;
}

function exactEvidence(samples: readonly Sample[]) {
  return {
    commits: samples.every(({ commitsAccepted }) => commitsAccepted),
    document: samples.every(({ exactDocument }) => exactDocument),
    rebase: samples.every(({ rebaseAccepted, rebased }) => rebaseAccepted && rebased),
    sequence: samples.every(({ exactSequence }) => exactSequence)
  };
}

function collaborationGates(
  commits: ReturnType<typeof statistics>,
  rebase: ReturnType<typeof statistics>,
  exact: ReturnType<typeof exactEvidence>
) {
  return [
    gate(
      "1k server-sequenced collaboration commits",
      commits.p95Milliseconds,
      COMMIT_P95_LIMIT_MILLISECONDS,
      exact.commits
    ),
    gate(
      "1k-revision disjoint collaboration rebase",
      rebase.p95Milliseconds,
      REBASE_P95_LIMIT_MILLISECONDS,
      [exact.document, exact.rebase, exact.sequence].every(Boolean)
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
