import { createUiEvent, UiEventPhase, type UiEvent } from "@unislang/unifold-events";
import { expect, it, vi } from "vitest";

import { RuntimePublicationBuffer } from "./runtime-publication-coordination.js";

it("drains reentrant events in FIFO order and then releases the buffer", () => {
  const buffer = new RuntimePublicationBuffer();
  const first = event("first", 1);
  const second = event("second", 2);
  const observed: UiEvent[] = [];
  const coordination = buffer.begin(
    0,
    (published) => {
      observed.push(published);
      if (published === first) buffer.append(second);
    },
    vi.fn()
  );
  expect(buffer.append(first)).toBe(true);
  coordination.commit();
  expect(observed).toEqual([first, second]);
  expect(buffer.append(event("direct", 3))).toBe(false);
});

it("restores the sequence and rejects a stale coordination handle on discard", () => {
  const buffer = new RuntimePublicationBuffer();
  const restore = vi.fn();
  const coordination = buffer.begin(7, vi.fn(), restore);
  coordination.discard();
  expect(restore).toHaveBeenCalledWith(7);
  expect(() => coordination.discard()).toThrow("closed");
});

it("rejects nested coordination and a corrupt buffered event", () => {
  const buffer = new RuntimePublicationBuffer();
  const coordination = buffer.begin(0, vi.fn(), vi.fn());
  expect(() => buffer.begin(0, vi.fn(), vi.fn())).toThrow("coordinated");
  buffer.append(undefined as never);
  expect(() => coordination.prepare()).toThrow("corrupt");
});

it("contains a committed observer failure and continues draining facts", () => {
  const buffer = new RuntimePublicationBuffer();
  const observed: string[] = [];
  const coordination = buffer.begin(
    0,
    (published) => {
      observed.push(published.id);
      if (published.id === "first") throw new Error("observer failed");
    },
    vi.fn()
  );
  buffer.append(event("first", 1));
  buffer.append(event("second", 2));
  coordination.prepare();
  expect(() => coordination.commit()).not.toThrow();
  expect(observed).toEqual(["first", "second"]);
});

function event(id: string, sequence: number): UiEvent {
  return createUiEvent({
    correlationid: "correlation",
    data: { phase: UiEventPhase.State, runtime: { documentId: "document" } },
    id,
    sequence,
    source: "urn:unifold:test",
    staterevision: 1,
    time: "2026-08-27T00:00:00.000Z",
    transactionid: "transaction",
    type: "org.unifold.ui.test.v1"
  });
}
