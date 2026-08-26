import { describe, expect, it } from "vitest";
import {
  CloudEventsSpecVersion,
  createUiEvent,
  UiEventContentType,
  UiEventPhase,
  UiEventType
} from "./index.js";

describe("createUiEvent", () => {
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
});
