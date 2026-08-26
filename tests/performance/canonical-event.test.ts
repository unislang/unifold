import { expect, it } from "vitest";

import {
  CANONICAL_EVENT_TYPES,
  createCanonicalEventHarness,
  ingestCanonicalIntent
} from "./canonical-event-fixture.js";

it("normalizes and delivers canonical critical-category intents exactly once", () => {
  const harness = createCanonicalEventHarness();
  try {
    const accepted = CANONICAL_EVENT_TYPES.map((_type, index) =>
      ingestCanonicalIntent(harness, index)
    );
    expect(accepted.map(({ sequence }) => sequence)).toEqual([1, 2, 3, 4, 5]);
    expect(accepted.map(({ type }) => type)).toEqual(CANONICAL_EVENT_TYPES);
    expect(harness.latencies).toHaveLength(CANONICAL_EVENT_TYPES.length);
    expect(() => harness.runtime.ingestIntent(accepted[0] as (typeof accepted)[number])).toThrow(
      "already ingested"
    );
    verifyDeliveries(accepted, [...harness.publishedFacts], [...harness.actorFacts]);
  } finally {
    harness.runtime.dispose();
  }
});

function verifyDeliveries(
  accepted: readonly { readonly id: string; readonly sequence: number; readonly type: string }[],
  published: readonly { readonly id: string; readonly sequence: number; readonly type: string }[],
  actor: readonly { readonly id: string; readonly sequence: number; readonly type: string }[]
): void {
  expect(published).toHaveLength(CANONICAL_EVENT_TYPES.length);
  expect(actor).toHaveLength(CANONICAL_EVENT_TYPES.length);
  expect(published.map(eventIdentity)).toEqual(accepted.map(eventIdentity));
  expect(actor.map(eventIdentity)).toEqual(published.map(eventIdentity));
}

function eventIdentity(event: {
  readonly id: string;
  readonly sequence: number;
  readonly type: string;
}) {
  return { id: event.id, sequence: event.sequence, type: event.type };
}
