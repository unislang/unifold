import {
  DataClassification,
  UiCommandType,
  UiEventPhase,
  UiEventType,
  UiNodeKind,
  createUiEvent,
  type UiEvent
} from "@unislang/unifold-events";
import { expect, it } from "vitest";

import { UnifoldRuntime } from "./index.js";
import { controlNode } from "./runtime.test-data.js";

it("orders validated component intents with committed facts", () => {
  const runtime = new UnifoldRuntime({
    documentId: "test",
    initialNodes: [controlNode("field", "A")]
  });
  const events: UiEvent[] = [];
  runtime.events$.subscribe((event) => events.push(event));
  expect(() => runtime.ingestIntent(intent("wrong", UiEventPhase.State, "test"))).toThrow(
    "Only intent"
  );
  expect(() => runtime.ingestIntent(intent("other", UiEventPhase.Intent, "other"))).toThrow(
    "another document"
  );
  const accepted = intent("accepted", UiEventPhase.Intent, "test");
  expect(runtime.ingestIntent(accepted).sequence).toBe(1);
  expect(() => runtime.ingestIntent(accepted)).toThrow("already ingested");
  runtime.execute([{ type: UiCommandType.ControlSetValue, id: "field", value: "B" }]);
  expect(events.map((event) => event.sequence)).toEqual([1, 2, 3]);
  expect(events.map((event) => event.type)).toEqual([
    "org.unifold.ui.control.input.v1",
    UiEventType.CommandApplied,
    UiEventType.TransactionCommitted
  ]);
});

it("publishes a public-safe projection while returning the accepted private intent", () => {
  const restricted = controlNode("field", "secret-value");
  const runtime = new UnifoldRuntime({
    documentId: "test",
    initialNodes: [
      {
        ...restricted,
        base: { ...restricted.base, dataClassification: DataClassification.Restricted }
      }
    ]
  });
  const events: UiEvent[] = [];
  runtime.events$.subscribe((event) => events.push(event));
  const accepted = runtime.ingestIntent(intent("restricted", UiEventPhase.Intent, "test"));
  expect(accepted.data.change).toEqual({ value: "B" });
  expect(events[0]).toMatchObject({
    data: { disclosure: { classification: DataClassification.Restricted } }
  });
  expect((events[0] as UiEvent).data.change).toBeUndefined();
  expect((events[0] as UiEvent).data.snapshot).toBeUndefined();
});

function intent(id: string, phase: UiEventPhase, documentId: string): UiEvent {
  return createUiEvent({
    data: {
      change: { value: "B" },
      phase,
      runtime: { documentId },
      sourceNode: {
        id: "field",
        instanceId: "field",
        kind: UiNodeKind.Control,
        scopePath: ["field"],
        type: "TextField",
        version: "1.0.0"
      }
    },
    id,
    source: "urn:unifold:component:field",
    time: "2026-08-24T00:00:00.000Z",
    type: "org.unifold.ui.control.input.v1",
    correlationid: "correlation",
    sequence: 99,
    staterevision: 0,
    transactionid: "transaction"
  });
}
