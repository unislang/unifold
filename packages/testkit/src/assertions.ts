import type { JsonValue } from "@unislang/unifold-contracts";
import type { UiEvent } from "@unislang/unifold-events";
import type { CanonicalEventExpectation, SelectiveUpdateExpectation } from "./scenario.js";

export interface SelectiveUpdateObservation {
  readonly nodeId: string;
  readonly updateCount: number;
}

export function assertCanonicalEvent(event: UiEvent, expected: CanonicalEventExpectation): void {
  assertEqual(event.type, expected.type, "event type");
  assertOptional(event.data.phase, expected.phase, "event phase");
  assertOptional(event.data.sourceNode?.id, expected.sourceNodeId, "source node");
  assertOptional(event.transactionid, expected.transactionId, "transaction id");
  assertOptionalJson(event.data.change, expected.change, "event change");
}

export function assertCanonicalEventSequence(
  events: readonly UiEvent[],
  expected: readonly CanonicalEventExpectation[]
): void {
  assertEqual(events.length, expected.length, "event count");
  expected.forEach((item, index) => {
    const event = events[index];
    if (!event) throw new ScenarioAssertionError(`Missing event at index ${index}.`);
    assertCanonicalEvent(event, item);
  });
}

export function assertSelectiveUpdates(
  observations: readonly SelectiveUpdateObservation[],
  expected: SelectiveUpdateExpectation
): void {
  const counts = new Map(observations.map((item) => [item.nodeId, item.updateCount]));
  expected.affectedNodeIds.forEach((id) => assertUpdated(counts, id));
  expected.unaffectedNodeIds.forEach((id) => assertUnchanged(counts, id));
}

export class ScenarioAssertionError extends Error {
  override readonly name = "ScenarioAssertionError";
}

function assertUpdated(counts: ReadonlyMap<string, number>, id: string): void {
  const count = counts.get(id) ?? 0;
  if (count < 1) throw new ScenarioAssertionError(`Expected ${id} to update.`);
}

function assertUnchanged(counts: ReadonlyMap<string, number>, id: string): void {
  const count = counts.get(id) ?? 0;
  if (count > 0) throw new ScenarioAssertionError(`Expected ${id} to remain unchanged.`);
}

function assertEqual(actual: unknown, expected: unknown, label: string): void {
  if (actual !== expected) {
    throw new ScenarioAssertionError(`Unexpected ${label}: ${String(actual)}.`);
  }
}

function assertOptional(actual: unknown, expected: unknown, label: string): void {
  if (expected !== undefined) assertEqual(actual, expected, label);
}

function assertOptionalJson(
  actual: JsonValue | undefined,
  expected: JsonValue | undefined,
  label: string
): void {
  if (expected === undefined) return;
  assertEqual(JSON.stringify(actual), JSON.stringify(expected), label);
}
