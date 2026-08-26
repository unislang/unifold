// @vitest-environment happy-dom
import type { UiEvent, UiNodeSnapshot } from "@unislang/unifold-events";
import { html } from "lit";
import { expect, it, vi } from "vitest";

import { ElementEventName, ElementEventType, UnifoldElement } from "./index.js";
import { controlNode } from "./elements.test-data.js";
import { isJsonObject } from "./unifold-element.js";

class EventProbe extends UnifoldElement {
  emit(type: ElementEventType): UiEvent {
    return this.emitUiEvent(type, { value: "changed" });
  }

  protected override render() {
    return html`<span>probe</span>`;
  }
}

it("requires event metadata before emitting", verifyRequiredMetadata);
it("emits immutable canonical intent metadata", verifyCanonicalIntent);
it("tracks render diagnostics", verifyRenderDiagnostics);
it("recognizes only JSON objects", verifyJsonObjects);

function createProbe(): EventProbe {
  const tag = "unifold-event-probe";
  if (customElements.get(tag) === undefined) customElements.define(tag, EventProbe);
  return document.createElement(tag) as EventProbe;
}

function verifyRequiredMetadata(): void {
  const probe = createProbe();
  expect(() => probe.emit(ElementEventType.ControlInput)).toThrow("metadata is not configured");
}

async function verifyCanonicalIntent(): Promise<void> {
  const probe = createProbe();
  probe.eventNode = controlNode("field", "A", "form");
  probe.runtimeContext = { documentId: "document-1", locale: "en-US" };
  probe.setAttribute("data-purpose", "test");
  document.body.append(probe);
  await probe.updateComplete;
  const listener = vi.fn();
  probe.addEventListener(ElementEventName.UiEvent, listener);
  const first = probe.emit(ElementEventType.ControlInput);
  const second = probe.emit(ElementEventType.ControlBlurred);
  expect(listener).toHaveBeenCalledTimes(2);
  expect(first).toMatchObject({
    source: "urn:unifold:component:field",
    subject: "field",
    sequence: 1,
    staterevision: 2,
    data: { phase: "intent", runtime: { documentId: "document-1" } }
  });
  expect(first.data.sourceNode).toMatchObject({ id: "field", parentId: "form" });
  const snapshot = requiredSnapshot(first);
  expect(snapshot.attributes).toMatchObject({ "data-purpose": "test" });
  expect(snapshot.control).toMatchObject({ value: "A" });
  expect(second.sequence).toBe(2);
  expect(first.id).not.toBe(second.id);
}

async function verifyRenderDiagnostics(): Promise<void> {
  const probe = createProbe();
  document.body.append(probe);
  await probe.updateComplete;
  expect(probe.dataset["unifoldRenderCount"]).toBe("1");
  probe.requestUpdate();
  await probe.updateComplete;
  expect(probe.dataset["unifoldRenderCount"]).toBe("2");
}

function verifyJsonObjects(): void {
  expect(isJsonObject({ value: "A" })).toBe(true);
  expect(isJsonObject([])).toBe(false);
  expect(isJsonObject(null)).toBe(false);
  expect(isJsonObject(undefined)).toBe(false);
}

function requiredSnapshot(event: UiEvent): UiNodeSnapshot {
  const snapshot = event.data.snapshot;
  if (snapshot === undefined) throw new Error("Event snapshot is missing.");
  return snapshot;
}
