import { UiCollectionOperationType } from "@unislang/unifold-contracts";
import { UiEventType, type UiEvent } from "@unislang/unifold-events";

export function collectionOperationTypes(events: readonly UiEvent[]): UiCollectionOperationType[] {
  return events.flatMap((event) => optionalOperationType(eventCollectionOperationType(event)));
}

export function operationEventsAreCausal(events: readonly UiEvent[]): boolean {
  return operationEvents(events).every((operation) => hasCausalTransaction(operation, events));
}

export function operationEventsHaveTrustedOrigin(events: readonly UiEvent[]): boolean {
  return operationEvents(events).every(
    (event) =>
      event.correlationid === "collection-journey" &&
      event.causationid === `collection-${eventCollectionOperationType(event)}`
  );
}

export function lateRemovedEventCount(
  events: readonly UiEvent[],
  removedAt: number | undefined
): number {
  if (removedAt === undefined) return 0;
  return events.filter((event) => isLateRemovedEvent(event, removedAt)).length;
}

function operationEvents(events: readonly UiEvent[]): readonly UiEvent[] {
  return events.filter((event) => eventCollectionMetadata(event) !== undefined);
}

function eventCollectionOperationType(event: UiEvent): UiCollectionOperationType | undefined {
  if (event.type !== UiEventType.CommandApplied) return undefined;
  return operationType(eventCollectionMetadata(event));
}

function operationType(
  metadata: Readonly<Record<string, unknown>> | undefined
): UiCollectionOperationType | undefined {
  if (metadata === undefined) return undefined;
  const value = metadata["type"];
  return isCollectionOperationType(value) ? value : undefined;
}

function optionalOperationType(
  value: UiCollectionOperationType | undefined
): readonly UiCollectionOperationType[] {
  return value === undefined ? [] : [value];
}

function hasCausalTransaction(operation: UiEvent, events: readonly UiEvent[]): boolean {
  const transaction = events.find(({ sequence }) => sequence === operation.sequence + 1);
  if (transaction?.type !== UiEventType.TransactionCommitted) return false;
  return sameEventContext(operation, transaction);
}

function sameEventContext(left: UiEvent, right: UiEvent): boolean {
  return (
    left.transactionid === right.transactionid &&
    left.correlationid === right.correlationid &&
    left.causationid === right.causationid
  );
}

function eventCollectionMetadata(event: UiEvent): Readonly<Record<string, unknown>> | undefined {
  return record(record(event.data.change)?.["collectionOperation"]);
}

function isCollectionOperationType(value: unknown): value is UiCollectionOperationType {
  return Object.values(UiCollectionOperationType).includes(value as UiCollectionOperationType);
}

function isLateRemovedEvent(event: UiEvent, removedAt: number): boolean {
  return event.sequence > removedAt && event.data.sourceNode?.id === "field::c";
}

function record(value: unknown): Readonly<Record<string, unknown>> | undefined {
  if (!isObject(value)) return undefined;
  return Array.isArray(value) ? undefined : (value as Readonly<Record<string, unknown>>);
}

function isObject(value: unknown): value is object {
  return value !== null && typeof value === "object";
}
