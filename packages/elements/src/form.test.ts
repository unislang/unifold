// @vitest-environment happy-dom
import { ButtonAction } from "@unislang/unifold-catalog";
import type { JsonValue } from "@unislang/unifold-contracts";
import { createUiEvent, UiEventPhase, type UiEvent, UiNodeKind } from "@unislang/unifold-events";
import { expect, it } from "vitest";

import {
  ElementEventName,
  ElementEventType,
  registerCoreElements,
  UnifoldButton,
  UnifoldForm,
  UnifoldTextField
} from "./index.js";
import { compositionNode, controlNode } from "./elements.test-data.js";

it("requests coordinated submission from an activation", verifyComposedSubmit);
it("requests coordinated submission through native submit", verifyNativeSubmit);
it("requests coordinated reset from activation and native reset", verifyResetRequests);
it("ignores non-value changes and non-submit activations", verifyIgnoredChildEvents);

async function verifyComposedSubmit(): Promise<void> {
  const { form, field, button } = await mountComposition();
  const events: UiEvent[] = [];
  form.addEventListener(ElementEventName.UiEvent, (event) => events.push(detail(event)));
  const input = requiredInput(field);
  input.value = "Ada";
  input.dispatchEvent(new InputEvent("input", { bubbles: true }));
  form.eventNode = compositionNode("form", { fullName: "Ada" });
  requiredButton(button).click();
  await Promise.resolve();
  const requested = requiredSubmitRequest(events);
  expect(requested.data.change).toEqual({ revision: 2 });
  expect(requested.data.snapshot).toMatchObject({ properties: { label: "Profile" } });
}

async function verifyNativeSubmit(): Promise<void> {
  const { field, form } = await mountComposition();
  const events: UiEvent[] = [];
  form.addEventListener(ElementEventName.UiEvent, (event) => events.push(detail(event)));
  form.eventNode = compositionNode("form", { committed: "runtime" });
  const nativeForm = requiredNativeForm(form);
  expect(nativeForm.querySelector("unifold-text-field")).toBe(field);
  expect(form.children).toHaveLength(0);
  nativeForm.dispatchEvent(new SubmitEvent("submit", { bubbles: true, cancelable: true }));
  expect(requiredEvent(events, events.length - 1).data.change).toEqual({ revision: 2 });
}

async function verifyResetRequests(): Promise<void> {
  const { form, button } = await mountComposition();
  const events: UiEvent[] = [];
  form.addEventListener(ElementEventName.UiEvent, (event) => events.push(detail(event)));
  button.action = ButtonAction.Reset;
  await button.updateComplete;
  requiredButton(button).click();
  await Promise.resolve();
  const nativeForm = requiredNativeForm(form);
  nativeForm.dispatchEvent(new Event("reset", { bubbles: true, cancelable: true }));
  expect(events.filter((event) => event.type === ElementEventType.FormResetRequested)).toHaveLength(
    2
  );
}

async function verifyIgnoredChildEvents(): Promise<void> {
  const { form } = await mountComposition();
  const events: UiEvent[] = [];
  form.addEventListener(ElementEventName.UiEvent, (event) => events.push(detail(event)));
  form.dispatchEvent(exampleChildEvent(ElementEventType.ControlInput, "invalid"));
  form.dispatchEvent(
    exampleChildEvent(ElementEventType.ComponentActivated, { action: ButtonAction.Button })
  );
  await Promise.resolve();
  expect(
    events.filter((event) => event.type === ElementEventType.FormSubmitRequested)
  ).toHaveLength(0);
  expect(events.filter((event) => event.type === ElementEventType.FormResetRequested)).toHaveLength(
    0
  );
}

async function mountComposition() {
  registerCoreElements();
  const form = document.createElement("unifold-form") as UnifoldForm;
  const field = document.createElement("unifold-text-field") as UnifoldTextField;
  const button = document.createElement("unifold-button") as UnifoldButton;
  form.eventNode = compositionNode("form");
  form.label = "Profile";
  field.eventNode = controlNode("name", "", "form");
  field.name = "fullName";
  button.eventNode = controlNode("submit", "", "form");
  button.action = ButtonAction.Submit;
  form.append(field, button);
  document.body.append(form);
  await Promise.all([form.updateComplete, field.updateComplete, button.updateComplete]);
  return { form, field, button };
}

function exampleChildEvent(type: ElementEventType, change: JsonValue): CustomEvent<UiEvent> {
  const detail = createUiEvent({
    id: "child-event",
    source: "urn:test:child",
    type,
    time: "2026-08-24T00:00:00.000Z",
    correlationid: "correlation",
    transactionid: "transaction",
    sequence: 1,
    staterevision: 1,
    data: {
      phase: UiEventPhase.Intent,
      change,
      sourceNode: sourceNode(),
      snapshot: compositionNode("snapshot"),
      runtime: { documentId: "test" }
    }
  });
  return new CustomEvent(ElementEventName.UiEvent, { bubbles: true, composed: true, detail });
}

function sourceNode() {
  return {
    id: "source-control",
    instanceId: "source-control",
    kind: UiNodeKind.Control,
    scopePath: ["form", "source-control"],
    type: "TextField",
    version: "1.0.0"
  };
}

function requiredInput(field: UnifoldTextField): HTMLInputElement {
  const input = field.shadowRoot?.querySelector("input");
  if (!(input instanceof HTMLInputElement)) throw new Error("Input was not rendered.");
  return input;
}

function requiredButton(button: UnifoldButton): HTMLButtonElement {
  const native = button.shadowRoot?.querySelector("button");
  if (!(native instanceof HTMLButtonElement)) throw new Error("Button was not rendered.");
  return native;
}

function detail(event: Event): UiEvent {
  return (event as CustomEvent<UiEvent>).detail;
}

function requiredSubmitRequest(events: readonly UiEvent[]): UiEvent {
  const event = events.find((candidate) => candidate.type === ElementEventType.FormSubmitRequested);
  if (event === undefined) throw new Error("Form submission request is missing.");
  return event;
}

function requiredNativeForm(form: UnifoldForm): HTMLFormElement {
  const native = form.shadowRoot?.querySelector("form");
  if (!(native instanceof HTMLFormElement)) throw new Error("Form was not rendered.");
  return native;
}

function requiredEvent(events: readonly UiEvent[], index: number): UiEvent {
  const event = events[index];
  if (event === undefined) throw new Error(`Event ${index} is missing.`);
  return event;
}
