import { UiEventPhase } from "@unislang/unifold-events";
import { expect, it } from "vitest";

import { event } from "./devtools.test-data.js";
import { DevtoolsTimeline } from "./timeline.js";

it("retains a bounded deduplicated timeline with explicit drop evidence", () => {
  const timeline = new DevtoolsTimeline(10);
  for (let sequence = 1; sequence <= 12; sequence += 1) timeline.append(event(sequence));
  expect(timeline.append(event(12))).toBe(false);
  expect(timeline.snapshot()).toMatchObject({
    dropped: 2,
    latestSequence: 12,
    oldestSequence: 3
  });
  expect(timeline.snapshot().entries).toHaveLength(10);
  timeline.clear();
  expect(timeline.snapshot().entries).toEqual([]);
});

it("filters canonical chains, phases, nodes, scopes, and event types", () => {
  const timeline = new DevtoolsTimeline();
  timeline.append(event(1));
  const filters = [
    { correlationId: "correlation-1" },
    { phase: UiEventPhase.State },
    { scopeId: "field" },
    { sourceNodeId: "field" },
    { transactionId: "transaction-1" },
    { type: event(1).type }
  ];
  expect(filters.every((filter) => timeline.snapshot(filter).entries.length === 1)).toBe(true);
  expect(timeline.snapshot({ causationId: "missing" }).entries).toEqual([]);
  expect(() => new DevtoolsTimeline(1)).toThrow(RangeError);
});
