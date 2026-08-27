import { createUiEvent, UiEventPhase, UiEventType, UiNodeKind } from "@unislang/unifold-events";
import { describe, expect, it, vi } from "vitest";
import { toXStateEvent, XStateEventRouter } from "./index.js";
import { exampleEvent as lifecycleEvent } from "./effect-actor.test-data.js";

describe("XStateEventRouter", () => {
  it("routes once to an actor owning multiple scopes", () => {
    const send = vi.fn();
    const actor = { send };
    const router = new XStateEventRouter();
    router.register("form", actor);
    router.register("field", actor);

    router.route(exampleEvent());

    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0]?.[0].type).toBe(UiEventType.CommandApplied);
  });
});

it("contains a failing actor without blocking sibling delivery", () => {
  const delivered = vi.fn();
  const router = new XStateEventRouter();
  router.register("field", {
    send: () => {
      throw new Error("actor failed");
    }
  });
  router.register("field", { send: delivered });

  const event = exampleEvent();
  expect(() => router.route(event)).not.toThrow();
  expect(delivered).toHaveBeenCalledWith(toXStateEvent(event));
});

it("unregisters owners, clears ownership, and freezes actor events", () => {
  const actor = { send: vi.fn() };
  const router = new XStateEventRouter();
  const unregister = router.register("field", actor);
  unregister();
  unregister();
  router.route(lifecycleEvent(UiEventType.CommandApplied));
  router.register("field", actor);
  router.clear();
  router.route(lifecycleEvent(UiEventType.CommandApplied));
  expect(actor.send).not.toHaveBeenCalled();
  const event = { ...lifecycleEvent(UiEventType.TransactionCommitted), subject: "effect-1" };
  const converted = toXStateEvent(event);
  expect(converted).toEqual({ type: event.type, uiEvent: event });
  expect(converted.uiEvent.subject).toBe("effect-1");
  expect(Object.isFrozen(converted)).toBe(true);
});

it("removes every actor owned by a removed node", () => {
  const actor = { send: vi.fn() };
  const router = new XStateEventRouter();
  router.register("field", actor);
  router.removeOwner("field");
  router.route(lifecycleEvent(UiEventType.CommandApplied));
  expect(actor.send).not.toHaveBeenCalled();
});

function exampleEvent() {
  return createUiEvent({
    id: "event-1",
    source: "urn:unifold:node:field",
    type: UiEventType.CommandApplied,
    time: "2026-08-24T00:00:00.000Z",
    correlationid: "correlation-1",
    transactionid: "transaction-1",
    sequence: 1,
    staterevision: 1,
    data: {
      phase: UiEventPhase.State,
      sourceNode: {
        id: "field",
        instanceId: "field",
        kind: UiNodeKind.Control,
        scopePath: ["form", "field"],
        type: "TextField",
        version: "1.0.0"
      },
      runtime: { documentId: "test" }
    }
  });
}
