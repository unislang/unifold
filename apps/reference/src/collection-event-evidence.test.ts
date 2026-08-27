import { UiCollectionOperationType } from "@unislang/unifold-contracts";
import { UiEventType, type UiEvent } from "@unislang/unifold-events";
import { expect, it } from "vitest";

import {
  collectionOperationTypes,
  lateRemovedEventCount,
  operationEventsAreCausal,
  operationEventsHaveTrustedOrigin
} from "./collection-event-evidence.js";

it("recognizes causal, originated collection evidence and stale node events", () => {
  const operation = event(1, UiEventType.CommandApplied, {
    change: { collectionOperation: { type: UiCollectionOperationType.Insert } }
  });
  const committed = event(2, UiEventType.TransactionCommitted);
  const late = event(3, UiEventType.ValidationCompleted, { sourceNode: { id: "field::c" } });
  const events = [operation, committed, late];
  expect(collectionOperationTypes(events)).toEqual([UiCollectionOperationType.Insert]);
  expect(operationEventsAreCausal(events)).toBe(true);
  expect(operationEventsHaveTrustedOrigin(events)).toBe(true);
  expect(lateRemovedEventCount(events, 2)).toBe(1);
});

function event(sequence: number, type: UiEventType, data: object = {}): UiEvent {
  return {
    causationid: "collection-insert",
    correlationid: "collection-journey",
    data,
    sequence,
    transactionid: "transaction",
    type
  } as UiEvent;
}
