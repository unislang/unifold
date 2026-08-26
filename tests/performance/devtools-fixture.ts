import { DataClassification } from "@unislang/unifold-contracts";
import { DevtoolsProjectionMode, DevtoolsTimeline, inspectNodes } from "@unislang/unifold-devtools";
import { UiEventPhase, UiNodeKind, createUiEvent, type UiEvent } from "@unislang/unifold-events";
import type { UiRuntimeInspectionSnapshot } from "@unislang/unifold-runtime";

import { percentile } from "./profile-statistics.js";
import { createAggregateScaleNodes } from "./scale-fixture.js";

const EVENT_COUNT = 10_000;
const TIMELINE_CAPACITY = 1_000;
const NODE_COUNT = 500;
const PROFILE_SAMPLES = 20;
const TIMELINE_P95_LIMIT_MILLISECONDS = 1_000;
const PICKER_P95_LIMIT_MILLISECONDS = 100;

interface DevtoolsSample {
  readonly exactNodes: boolean;
  readonly exactTimeline: boolean;
  readonly pickerMilliseconds: number;
  readonly timelineMilliseconds: number;
}

export function measureDevtoolsPerformance(sampleCount = PROFILE_SAMPLES) {
  const events = Array.from({ length: EVENT_COUNT }, (_, index) => timelineEvent(index + 1));
  const inspection = nodeInspection();
  const samples = Array.from({ length: sampleCount }, () => measureSample(events, inspection));
  const picker = statistics(samples.map(({ pickerMilliseconds }) => pickerMilliseconds));
  const timeline = statistics(samples.map(({ timelineMilliseconds }) => timelineMilliseconds));
  const verified = {
    nodes: samples.every(({ exactNodes }) => exactNodes),
    timeline: samples.every(({ exactTimeline }) => exactTimeline)
  };
  return {
    eventCount: EVENT_COUNT,
    gates: devtoolsGates(timeline, picker, verified),
    nodeCount: NODE_COUNT,
    picker,
    sampleCount,
    timeline,
    timelineCapacity: TIMELINE_CAPACITY,
    verified
  };
}

function measureSample(
  events: readonly UiEvent[],
  inspection: UiRuntimeInspectionSnapshot
): DevtoolsSample {
  const timelineResult = measureTimeline(events);
  const pickerResult = measurePicker(inspection);
  return {
    exactNodes: pickerResult.exact,
    exactTimeline: timelineResult.exact,
    pickerMilliseconds: pickerResult.milliseconds,
    timelineMilliseconds: timelineResult.milliseconds
  };
}

function measureTimeline(events: readonly UiEvent[]) {
  const timeline = new DevtoolsTimeline(TIMELINE_CAPACITY);
  const started = performance.now();
  events.forEach((event) => timeline.append(event));
  const snapshot = timeline.snapshot({ correlationId: "devtools-correlation" });
  const milliseconds = performance.now() - started;
  const exact = [
    snapshot.dropped === EVENT_COUNT - TIMELINE_CAPACITY,
    snapshot.entries.length === TIMELINE_CAPACITY,
    snapshot.oldestSequence === EVENT_COUNT - TIMELINE_CAPACITY + 1,
    snapshot.latestSequence === EVENT_COUNT
  ].every(Boolean);
  return { exact, milliseconds };
}

function measurePicker(inspection: UiRuntimeInspectionSnapshot) {
  const started = performance.now();
  const projected = inspectNodes(inspection, { limit: NODE_COUNT });
  const milliseconds = performance.now() - started;
  const full = projected.filter(({ mode }) => mode === DevtoolsProjectionMode.Full).length;
  const metadata = projected.filter(({ mode }) => mode === DevtoolsProjectionMode.MetadataOnly);
  const exact = [
    projected.length === NODE_COUNT,
    full === NODE_COUNT / 2,
    metadata.length === NODE_COUNT / 2,
    metadata.every(({ snapshot }) => snapshot === undefined)
  ].every(Boolean);
  return { exact, milliseconds };
}

function nodeInspection(): UiRuntimeInspectionSnapshot {
  const nodes = createAggregateScaleNodes(NODE_COUNT, 50).map((node, index) => ({
    ...node,
    base: {
      ...node.base,
      dataClassification:
        index % 2 === 0 ? DataClassification.Public : DataClassification.Restricted
    }
  }));
  return {
    nodes,
    revision: 0,
    selectionDispatch: {
      activeSelections: 0,
      candidateSelections: 0,
      changedNodeCount: 0,
      invalidatedSelections: 0
    }
  };
}

function timelineEvent(sequence: number): UiEvent {
  return createUiEvent({
    correlationid: "devtools-correlation",
    data: {
      phase: UiEventPhase.State,
      runtime: { documentId: "devtools-performance" },
      sourceNode: sourceNode()
    },
    id: `devtools-event-${sequence}`,
    sequence,
    source: "urn:unifold:devtools-performance",
    staterevision: sequence,
    time: "2026-08-25T12:00:00.000Z",
    transactionid: `devtools-transaction-${sequence}`,
    type: "org.unifold.ui.transaction.committed.v1"
  });
}

function sourceNode() {
  return {
    id: "field-00000",
    instanceId: "field-00000",
    kind: UiNodeKind.Control,
    scopePath: ["aggregate-root", "field-00000"],
    type: "TextField",
    version: "1.0.0"
  };
}

function devtoolsGates(
  timeline: ReturnType<typeof statistics>,
  picker: ReturnType<typeof statistics>,
  verified: { readonly nodes: boolean; readonly timeline: boolean }
) {
  return [
    gate(
      "10k-event bounded devtools timeline",
      timeline.p95Milliseconds,
      TIMELINE_P95_LIMIT_MILLISECONDS,
      verified.timeline
    ),
    gate(
      "500-node privacy-aware picker",
      picker.p95Milliseconds,
      PICKER_P95_LIMIT_MILLISECONDS,
      verified.nodes
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
