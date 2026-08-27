import { expect, it } from "vitest";
import {
  CloudEventsSpecVersion,
  createUiEvent,
  UiCommandType,
  UiEventContentType,
  UiEventDataSchema,
  UiEventPhase,
  UiEventType
} from "./index.js";

it("creates a CloudEvents 1.0-compatible immutable envelope", () => {
  const event = createUiEvent({
    id: "event-1",
    source: "urn:unifold:runtime:test",
    type: UiEventType.TransactionCommitted,
    time: "2026-08-24T00:00:00.000Z",
    correlationid: "correlation-1",
    transactionid: "transaction-1",
    sequence: 1,
    staterevision: 1,
    data: {
      phase: UiEventPhase.State,
      runtime: { documentId: "test" }
    }
  });

  expect(event.specversion).toBe(CloudEventsSpecVersion.V1);
  expect(event.datacontenttype).toBe(UiEventContentType.Json);
  expect(Object.isFrozen(event)).toBe(true);
});

it("preserves standard subject correlation and a versioned data schema", () => {
  const event = createUiEvent({
    id: "effect-requested-1",
    source: "urn:unifold:runtime:test",
    subject: "effect-command-1",
    type: UiEventType.EffectRequested,
    time: "2026-08-24T00:00:00.000Z",
    dataschema: UiEventDataSchema.EffectV1,
    correlationid: "correlation-1",
    transactionid: "transaction-1",
    sequence: 1,
    staterevision: 0,
    data: {
      change: { commandType: UiCommandType.FocusRequest, targetId: "field" },
      phase: UiEventPhase.Effect,
      runtime: { documentId: "test" }
    }
  });

  expect(event.subject).toBe("effect-command-1");
  expect(event.dataschema).toBe(UiEventDataSchema.EffectV1);
});
