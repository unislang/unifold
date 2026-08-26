import { UiEventPhase, type UiEvent } from "@unislang/unifold-events";

export function acceptIntent(
  event: UiEvent,
  documentId: string,
  ids: Set<string>,
  nextSequence: () => number
): UiEvent {
  assertIntentPhase(event);
  assertIntentDocument(event, documentId);
  assertNewIntent(event, ids);
  ids.add(event.id);
  return Object.freeze({ ...event, sequence: nextSequence() });
}

function assertIntentPhase(event: UiEvent): void {
  if (event.data.phase !== UiEventPhase.Intent)
    throw new Error("Only intent events can be ingested.");
}

function assertIntentDocument(event: UiEvent, documentId: string): void {
  if (event.data.runtime.documentId !== documentId) {
    throw new Error(`Intent belongs to another document: ${event.data.runtime.documentId}.`);
  }
}

function assertNewIntent(event: UiEvent, ids: ReadonlySet<string>): void {
  if (ids.has(event.id)) throw new Error(`Intent was already ingested: ${event.id}.`);
}
