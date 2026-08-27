import type { JsonValue } from "@unislang/unifold-contracts";
import { UiEventType, type UiEvent } from "@unislang/unifold-events";
import type { UnifoldApplicationPort } from "@unislang/unifold";

import type { PrototypeWindow } from "./main.types.js";

export function installReferenceEventOutput(
  application: UnifoldApplicationPort,
  captureEvents: boolean
): void {
  if (captureEvents) resetReferenceEventCapture();
  application.runtime.events$.subscribe((event) => handleRuntimeEvent(event, captureEvents));
}

export function resetReferenceEventCapture(): void {
  const target = window as unknown as PrototypeWindow;
  target.__unifoldCapturedEvents = [];
}

function handleRuntimeEvent(event: UiEvent, captureEvents: boolean): void {
  requireTestElement("event-log").textContent = JSON.stringify(event, null, 2);
  if (captureEvents) captureRuntimeEvent(event);
  showFormResult(event);
}

function showFormResult(event: UiEvent): void {
  if (event.type !== UiEventType.FormSubmitted && event.type !== UiEventType.FormReset) return;
  requireTestElement("submitted-value").textContent = readSubmittedValue(event.data.change);
}

function captureRuntimeEvent(event: UiEvent): void {
  const target = window as unknown as PrototypeWindow;
  target.__unifoldCapturedEvents?.push(event);
}

function readSubmittedValue(change: JsonValue | undefined): string {
  if (!isRecord(change)) return "";
  const values = change["values"];
  return readName(values);
}

function readName(values: JsonValue | undefined): string {
  if (!isRecord(values)) return "";
  const value = values["name"];
  return value === undefined ? "" : String(value);
}

function requireTestElement(id: string): HTMLElement {
  const element = document.querySelector<HTMLElement>(`[data-testid="${id}"]`);
  if (element === null) throw new Error(`Missing test element: ${id}.`);
  return element;
}

function isRecord(value: JsonValue | undefined): value is Readonly<Record<string, JsonValue>> {
  if (value === null) return false;
  if (typeof value !== "object") return false;
  return !Array.isArray(value);
}
