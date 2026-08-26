import { UiEventPhase, createUiEvent, type UiEvent } from "@unislang/unifold-events";
import { UnifoldRuntime } from "@unislang/unifold-runtime";

import { percentile } from "./profile-statistics.js";
import { createAggregateScaleNodes } from "./scale-fixture.js";

export const CANONICAL_EVENT_GATE_NAME = "canonical intent normalization and actor delivery";
export const CANONICAL_EVENT_TYPES = [
  "org.unifold.ui.intent.commit.v1",
  "org.unifold.ui.intent.submit.v1",
  "org.unifold.ui.intent.approval.v1",
  "org.unifold.ui.intent.navigation.v1",
  "org.unifold.ui.intent.error.v1"
] as const;

interface TimingTracker {
  startedAt: number | undefined;
}

interface CanonicalEventHarness {
  readonly actorFacts: UiEvent[];
  readonly latencies: number[];
  readonly publishedFacts: UiEvent[];
  readonly runtime: UnifoldRuntime;
  readonly timing: TimingTracker;
}

export function createCanonicalEventHarness(): CanonicalEventHarness {
  const runtime = new UnifoldRuntime({
    documentId: "canonical-event-performance",
    initialNodes: createAggregateScaleNodes(4, 1)
  });
  const actorFacts: UiEvent[] = [];
  const publishedFacts: UiEvent[] = [];
  const latencies: number[] = [];
  const timing: TimingTracker = { startedAt: undefined };
  const actor: Parameters<UnifoldRuntime["registerActor"]>[1] = {
    send: ({ uiEvent }) => recordActorDelivery(uiEvent, actorFacts, latencies, timing)
  };
  runtime.registerActor("field-00000", actor);
  runtime.events$.subscribe((event) => publishedFacts.push(event));
  return { actorFacts, latencies, publishedFacts, runtime, timing };
}

export function ingestCanonicalIntent(harness: CanonicalEventHarness, sequence: number): UiEvent {
  const type = CANONICAL_EVENT_TYPES[sequence % CANONICAL_EVENT_TYPES.length] as string;
  const input = canonicalIntent(type, sequence);
  harness.timing.startedAt = performance.now();
  const accepted = harness.runtime.ingestIntent(input);
  harness.timing.startedAt = undefined;
  return accepted;
}

export function measureCanonicalEventPath() {
  const harness = createCanonicalEventHarness();
  try {
    ingestRange(harness, 0, 20);
    harness.latencies.length = 0;
    ingestRange(harness, 20, 500);
    return summarize(harness.latencies);
  } finally {
    harness.runtime.dispose();
  }
}

function ingestRange(harness: CanonicalEventHarness, start: number, count: number): void {
  for (let offset = 0; offset < count; offset += 1) {
    ingestCanonicalIntent(harness, start + offset);
  }
}

function recordActorDelivery(
  event: UiEvent,
  facts: UiEvent[],
  latencies: number[],
  timing: TimingTracker
): void {
  facts.push(event);
  if (timing.startedAt === undefined) return;
  latencies.push(performance.now() - timing.startedAt);
}

function canonicalIntent(type: string, sequence: number): UiEvent {
  return createUiEvent({
    correlationid: `canonical-correlation-${sequence}`,
    data: {
      change: { category: type },
      phase: UiEventPhase.Intent,
      runtime: { documentId: "canonical-event-performance" },
      sourceNode: sourceNode()
    },
    id: `canonical-intent-${sequence}`,
    sequence: 99,
    source: "urn:unifold:component:field-00000",
    staterevision: 0,
    time: "2026-08-25T00:00:00.000Z",
    transactionid: `canonical-transaction-${sequence}`,
    type
  });
}

function sourceNode() {
  return {
    id: "field-00000",
    instanceId: "field-00000",
    kind: "control",
    scopePath: ["aggregate-root", "group-000", "field-00000"],
    type: "TextField",
    version: "1.0.0"
  };
}

function summarize(samples: readonly number[]) {
  return {
    maximumMilliseconds: Math.max(...samples),
    meanMilliseconds: samples.reduce((sum, value) => sum + value, 0) / samples.length,
    minimumMilliseconds: Math.min(...samples),
    p50Milliseconds: percentile(samples, 0.5),
    p95Milliseconds: percentile(samples, 0.95),
    p99Milliseconds: percentile(samples, 0.99),
    sampleCount: samples.length
  };
}
