import { UiCommandType, type UiNodeSnapshot } from "@unislang/unifold-events";
import {
  createUnifoldApplicationObserver,
  type UnifoldApplicationObservation,
  type UnifoldApplicationObservationTarget
} from "@unislang/unifold";
import { UnifoldRuntime } from "@unislang/unifold-runtime";

import { percentile } from "./profile-statistics.js";
import { createAggregateScaleNodes } from "./scale-fixture.js";

const APPLICATION_COUNT = 10;
const EXECUTIONS_PER_APPLICATION = 50;
const EXPECTED_EVENT_COUNT = APPLICATION_COUNT * EXECUTIONS_PER_APPLICATION * 2;
const OBSERVATION_P95_LIMIT_MILLISECONDS = 250;
const PROFILE_SAMPLES = 30;

interface ObservationSample {
  readonly exact: boolean;
  readonly milliseconds: number;
}

export function measureApplicationObservation(sampleCount = PROFILE_SAMPLES) {
  const samples = Array.from({ length: sampleCount }, measureSample);
  const timings = samples.map(({ milliseconds }) => milliseconds);
  const p95Milliseconds = percentile(timings, 0.95);
  const exact = samples.every((sample) => sample.exact);
  return {
    applicationCount: APPLICATION_COUNT,
    eventCount: EXPECTED_EVENT_COUNT,
    gate: observationGate(p95Milliseconds, exact),
    p50Milliseconds: percentile(timings, 0.5),
    p95Milliseconds,
    p99Milliseconds: percentile(timings, 0.99),
    sampleCount
  };
}

function observationGate(actualP95Milliseconds: number, exact: boolean) {
  return {
    actualP95Milliseconds,
    exact,
    limitP95Milliseconds: OBSERVATION_P95_LIMIT_MILLISECONDS,
    name: "10-runtime 1k authorized observation fan-in",
    passed: exact && actualP95Milliseconds <= OBSERVATION_P95_LIMIT_MILLISECONDS
  };
}

function measureSample(): ObservationSample {
  const fixtures = Array.from({ length: APPLICATION_COUNT }, (_, index) => runtimeFixture(index));
  const observations: UnifoldApplicationObservation[] = [];
  const observer = createUnifoldApplicationObserver(
    fixtures.map(({ target }) => target),
    { authorize: () => true }
  );
  observer.events$.subscribe((observation) => observations.push(observation));
  const started = performance.now();
  fixtures.forEach(executeFixture);
  const milliseconds = performance.now() - started;
  const exact = exactObservation(fixtures, observations);
  observer.dispose();
  fixtures.forEach(({ runtime }) => runtime.dispose());
  return { exact, milliseconds };
}

function runtimeFixture(index: number) {
  let eventIndex = 0;
  const applicationId = `application-${index}`;
  const runtime = new UnifoldRuntime({
    createId: () => `${applicationId}-event-${++eventIndex}`,
    documentId: `document-${index}`,
    initialNodes: fixtureNodes(),
    now: () => "2026-08-27T00:00:00.000Z",
    source: `urn:performance:${applicationId}`
  });
  const target: UnifoldApplicationObservationTarget = {
    application: { runtime },
    applicationId,
    tenantId: `tenant-${index % 5}`
  };
  return { applicationId, runtime, target };
}

function executeFixture(fixture: ReturnType<typeof runtimeFixture>): void {
  for (let index = 0; index < EXECUTIONS_PER_APPLICATION; index += 1) {
    fixture.runtime.execute(
      [{ id: "field-00000", type: UiCommandType.ControlSetValue, value: `${index}` }],
      {
        causationId: `cause-${fixture.applicationId}-${index}`,
        correlationId: `trace-${fixture.applicationId}`,
        transactionId: `transaction-${fixture.applicationId}-${index}`
      }
    );
  }
}

function exactObservation(
  fixtures: readonly ReturnType<typeof runtimeFixture>[],
  observations: readonly UnifoldApplicationObservation[]
): boolean {
  const ids = new Set(observations.map(({ event }) => event.id));
  return [
    observations.length === EXPECTED_EVENT_COUNT,
    ids.size === EXPECTED_EVENT_COUNT,
    fixtures.every(({ applicationId }) => observedApplication(applicationId, observations))
  ].every(Boolean);
}

function observedApplication(
  applicationId: string,
  observations: readonly UnifoldApplicationObservation[]
): boolean {
  const events = observations.filter((item) => item.applicationId === applicationId);
  return (
    events.length === EXECUTIONS_PER_APPLICATION * 2 &&
    events.every(
      ({ event }) =>
        event.source === `urn:performance:${applicationId}` &&
        event.correlationid === `trace-${applicationId}`
    )
  );
}

function fixtureNodes(): readonly UiNodeSnapshot[] {
  return createAggregateScaleNodes(4, 1);
}
