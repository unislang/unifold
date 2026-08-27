import { UiCollectionOperationType } from "@unislang/unifold-contracts";
import { UiCommandType, UiEventPhase, UiEventType, type UiEvent } from "@unislang/unifold-events";

export function collectionOperationTypes(events: readonly UiEvent[]): UiCollectionOperationType[] {
  return events.flatMap((event) => optionalOperationType(eventCollectionOperationType(event)));
}

export function focusRequestIds(events: readonly UiEvent[]): string[] {
  return events.flatMap(focusRequestId);
}

export function focusEffectTypes(events: readonly UiEvent[]): string[] {
  return events.filter(isFocusEffect).map(({ type }) => type);
}

function isFocusEffect(event: UiEvent): boolean {
  return event.data.phase === UiEventPhase.Effect && isFocusRequest(record(event.data.change));
}

function focusRequestId(event: UiEvent): readonly string[] {
  if (event.type !== UiEventType.CommandApplied) return [];
  if (!isFocusRequest(record(event.data.change))) return [];
  return optionalSourceId(event);
}

function isFocusRequest(change: Readonly<Record<string, unknown>> | undefined): boolean {
  if (change === undefined) return false;
  return change["commandType"] === UiCommandType.FocusRequest;
}

function optionalSourceId(event: UiEvent): readonly string[] {
  return event.data.sourceNode === undefined ? [] : [event.data.sourceNode.id];
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

export function renderedNodeIds(container: HTMLElement): readonly string[] {
  return composedElements(container)
    .filter(({ dataset }) => dataset["unifoldNodeId"]?.startsWith("field::") === true)
    .map(({ id }) => id);
}

export function focusedNodeId(root: ParentNode): string | undefined {
  return [...composedElements(root)]
    .reverse()
    .find(
      (element) =>
        element.dataset["unifoldNodeId"] !== undefined && element.matches(":focus-within")
    )?.dataset["unifoldNodeId"];
}

function composedElements(root: ParentNode): readonly HTMLElement[] {
  return [...root.children].flatMap((child) => {
    const element = child as HTMLElement;
    return [
      element,
      ...composedElements(element),
      ...(element.shadowRoot === null ? [] : composedElements(element.shadowRoot))
    ];
  });
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
  const operationIndex = events.indexOf(operation);
  const following = events.slice(operationIndex + 1);
  const transaction = following.find(isTransactionCommitted);
  if (transaction === undefined || !sameEventContext(operation, transaction)) return false;
  return precedingEvents(following, transaction).every((event) =>
    sameEventContext(operation, event)
  );
}

function isTransactionCommitted(event: UiEvent): boolean {
  return event.type === UiEventType.TransactionCommitted;
}

function precedingEvents(events: readonly UiEvent[], target: UiEvent): readonly UiEvent[] {
  return events.slice(0, events.indexOf(target));
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
