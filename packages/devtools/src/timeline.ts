import type { UiEvent, UiTransactionRecord } from "@unislang/unifold-events";

import { projectTimelineEvent } from "./privacy.js";
import type {
  DevtoolsTimelineEntry,
  DevtoolsTimelineFilter,
  DevtoolsTimelineSnapshot
} from "./types.js";

export class DevtoolsTimeline {
  readonly #capacity: number;
  readonly #entries: DevtoolsTimelineEntry[] = [];
  readonly #eventIds = new Set<string>();
  #dropped = 0;

  constructor(capacity = 1_000) {
    validateCapacity(capacity);
    this.#capacity = capacity;
  }

  append(event: UiEvent, transaction?: UiTransactionRecord, capturedAt = event.time): boolean {
    if (this.#eventIds.has(event.id)) return false;
    const entry = freezeEntry(timelineEntry(event, capturedAt, transaction));
    this.#entries.push(entry);
    this.#eventIds.add(event.id);
    this.trim();
    return true;
  }

  snapshot(filter: DevtoolsTimelineFilter = {}): DevtoolsTimelineSnapshot {
    const entries = Object.freeze(this.#entries.filter((entry) => matches(entry.event, filter)));
    return Object.freeze({
      dropped: this.#dropped,
      entries,
      latestSequence: sequenceOf(this.#entries.at(-1)),
      oldestSequence: sequenceOf(this.#entries[0])
    });
  }

  clear(): void {
    this.#entries.length = 0;
    this.#eventIds.clear();
    this.#dropped = 0;
  }

  private trim(): void {
    if (this.#entries.length <= this.#capacity) return;
    const removed = this.#entries.shift();
    if (removed === undefined) return;
    this.#eventIds.delete(removed.event.id);
    this.#dropped += 1;
  }
}

function matches(event: UiEvent, filter: DevtoolsTimelineFilter): boolean {
  return [
    matchesValue(event.causationid, filter.causationId),
    matchesValue(event.correlationid, filter.correlationId),
    matchesValue(event.data.phase, filter.phase),
    matchesEventScope(event, filter.scopeId),
    matchesValue(event.data.sourceNode?.id, filter.sourceNodeId),
    matchesValue(event.transactionid, filter.transactionId),
    matchesValue(event.type, filter.type)
  ].every(Boolean);
}

function matchesValue(actual: unknown, expected: unknown): boolean {
  return expected === undefined || actual === expected;
}

function matchesEventScope(event: UiEvent, scopeId: string | undefined): boolean {
  if (scopeId === undefined) return true;
  return event.data.sourceNode?.scopePath.includes(scopeId) === true;
}

function validateCapacity(capacity: number): void {
  const valid = [Number.isInteger(capacity), capacity >= 10, capacity <= 10_000].every(Boolean);
  if (!valid)
    throw new RangeError("Devtools timeline capacity must be an integer from 10 through 10,000.");
}

function timelineEntry(
  event: UiEvent,
  capturedAt: string,
  transaction: UiTransactionRecord | undefined
): DevtoolsTimelineEntry {
  const entry = { capturedAt, event: projectTimelineEvent(event) };
  return transaction === undefined ? entry : { ...entry, transaction };
}

function sequenceOf(entry: DevtoolsTimelineEntry | undefined): number {
  return entry === undefined ? 0 : entry.event.sequence;
}

function freezeEntry(entry: DevtoolsTimelineEntry): DevtoolsTimelineEntry {
  return Object.freeze({
    ...entry,
    ...(entry.transaction === undefined
      ? {}
      : { transaction: Object.freeze(structuredClone(entry.transaction)) })
  });
}
