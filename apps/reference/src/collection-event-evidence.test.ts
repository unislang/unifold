import { UiCollectionOperationType } from "@unislang/unifold-contracts";
import { UiEventType, type UiEvent } from "@unislang/unifold-events";
import { expect, it } from "vitest";

import {
  collectionOperationTypes,
  focusRequestIds,
  lateRemovedEventCount,
  operationEventsAreCausal,
  operationEventsHaveTrustedOrigin
} from "./collection-event-evidence.js";

it("recognizes causal, originated collection evidence and stale node events", () => {
  const operation = event(1, UiEventType.CommandApplied, {
    change: { collectionOperation: { type: UiCollectionOperationType.Insert } }
  });
  const focus = event(2, UiEventType.CommandApplied, {
    change: { commandType: "focus.request" },
    sourceNode: { id: "field::a" }
  });
  const committed = event(3, UiEventType.TransactionCommitted);
  const late = event(4, UiEventType.ValidationCompleted, { sourceNode: { id: "field::c" } });
  const events = [operation, focus, committed, late];
  expect(collectionOperationTypes(events)).toEqual([UiCollectionOperationType.Insert]);
  expect(focusRequestIds(events)).toEqual(["field::a"]);
  expect(operationEventsAreCausal(events)).toBe(true);
  expect(operationEventsHaveTrustedOrigin(events)).toBe(true);
  expect(lateRemovedEventCount(events, 3)).toBe(1);
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
