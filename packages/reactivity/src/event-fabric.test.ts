import { createUiEvent, UiEventPhase, UiEventType, UiNodeKind } from "@unislang/unifold-events";
import { describe, expect, it, vi } from "vitest";
import { createEventFabric } from "./index.js";

describe("event fabric", () => {
  it("delivers the same ordered event through indexed views", () => {
    const controller = createEventFabric();
    const root = vi.fn();
    const node = vi.fn();
    const scope = vi.fn();
    controller.fabric.events$.subscribe(root);
    controller.fabric.nodeEvents("field").subscribe(node);
    controller.fabric.scopeEvents("form").subscribe(scope);
    const event = exampleEvent();

    controller.publish(event);

    expect(root).toHaveBeenCalledWith(event);
    expect(node).toHaveBeenCalledWith(event);
    expect(scope).toHaveBeenCalledWith(event);
    expect(root.mock.calls[0]?.[0]).toBe(node.mock.calls[0]?.[0]);
  });
});

it("completes and protects a disposed event fabric", () => {
  const controller = createEventFabric();
  const completed = vi.fn();
  const typed = vi.fn();
  controller.fabric.events$.subscribe({ complete: completed });
  const subscription = controller.fabric
    .typeEvents(UiEventType.TransactionCommitted)
    .subscribe(typed);
  controller.publish(exampleEvent());
  subscription.unsubscribe();
  controller.dispose();
  controller.dispose();
  expect(typed).toHaveBeenCalledTimes(1);
  expect(completed).toHaveBeenCalledTimes(1);
  expect(() => controller.publish(exampleEvent())).toThrow("disposed");
});

function exampleEvent() {
  return createUiEvent({
    id: "event-1",
    source: "urn:unifold:node:field",
    type: UiEventType.TransactionCommitted,
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
