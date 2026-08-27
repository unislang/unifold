import { UiCollectionOperationType } from "@unislang/unifold-contracts";
import { UiEventType, type UiEvent } from "@unislang/unifold-events";
import { expect, it } from "vitest";

import {
  collectionOperationTypes,
  focusCommandEffectIds,
  focusEffectTypes,
  focusLifecycleEffectIds,
  focusRequestIds,
  lateRemovedEventCount,
  operationEventsAreCausal,
  operationEventsHaveTrustedOrigin
} from "./collection-event-evidence.js";

it("recognizes causal, originated collection evidence and stale node events", () => {
  const events = collectionEvents();
  expect(collectionOperationTypes(events)).toEqual([UiCollectionOperationType.Insert]);
  expect(focusRequestIds(events)).toEqual(["field::a"]);
  expect(focusEffectTypes(events)).toEqual([
    UiEventType.EffectRequested,
    UiEventType.EffectCompleted
  ]);
  expect(focusCommandEffectIds(events)).toEqual(["effect-1"]);
  expect(focusLifecycleEffectIds(events)).toEqual(["effect-1", "effect-1"]);
  expect(operationEventsAreCausal(events)).toBe(true);
  expect(operationEventsHaveTrustedOrigin(events)).toBe(true);
  expect(lateRemovedEventCount(events, 5)).toBe(1);
});

function collectionEvents(): readonly UiEvent[] {
  const operation = event(1, UiEventType.CommandApplied, {
    change: { collectionOperation: { type: UiCollectionOperationType.Insert } }
  });
  const focus = focusEvent(2, UiEventType.CommandApplied);
  const requested = focusEvent(3, UiEventType.EffectRequested);
  const completed = focusEvent(4, UiEventType.EffectCompleted);
  const committed = event(5, UiEventType.TransactionCommitted);
  const late = event(6, UiEventType.ValidationCompleted, { sourceNode: { id: "field::c" } });
  return [operation, focus, requested, completed, committed, late];
}

function focusEvent(sequence: number, type: UiEventType): UiEvent {
  return event(
    sequence,
    type,
    {
      change: { commandType: "focus.request" },
      ...(type === UiEventType.CommandApplied ? {} : { phase: "effect" }),
      sourceNode: { id: "field::a" }
    },
    "effect-1"
  );
}

function event(sequence: number, type: UiEventType, data: object = {}, subject?: string): UiEvent {
  return {
    causationid: "collection-insert",
    correlationid: "collection-journey",
    data,
    sequence,
    ...(subject === undefined ? {} : { subject }),
    transactionid: "transaction",
    type
  } as UiEvent;
}
