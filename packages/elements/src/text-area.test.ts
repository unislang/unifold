// @vitest-environment happy-dom
import { TextAreaWrap } from "@unislang/unifold-catalog";
import type { UiEvent } from "@unislang/unifold-events";
import { expect, it } from "vitest";

import {
  ElementEventName,
  NativeFormValueOrigin,
  registerCoreElements,
  UnifoldTextArea
} from "./index.js";
import { controlNode } from "./elements.test-data.js";

it("renders a native textarea and emits its full string value", verifyTextArea);

async function verifyTextArea(): Promise<void> {
  const element = await mountTextArea();
  const events: UiEvent[] = [];
  element.addEventListener(ElementEventName.UiEvent, (event) => events.push(detail(event)));
  const textarea = requiredTextArea(element);
  expect(textarea.name).toBe("biography");
  expect(textarea.readOnly).toBe(true);
  expect(textarea.required).toBe(true);
  expect(Number(textarea.rows)).toBe(6);
  expect(textarea.getAttribute("wrap")).toBe(TextAreaWrap.Hard);
  textarea.value = "First line\nSecond line";
  textarea.dispatchEvent(new InputEvent("input", { bubbles: true }));
  expect(requiredEvent(events).data.change).toEqual({
    origin: NativeFormValueOrigin.Input,
    value: "First line\nSecond line"
  });
}

async function mountTextArea(): Promise<UnifoldTextArea> {
  registerCoreElements();
  const element = document.createElement("unifold-text-area") as UnifoldTextArea;
  element.eventNode = controlNode("bio", "", undefined, "TextArea");
  element.label = "Biography";
  element.name = "biography";
  element.readonly = true;
  element.required = true;
  element.rows = 6;
  element.wrap = TextAreaWrap.Hard;
  document.body.append(element);
  await element.updateComplete;
  return element;
}

function requiredTextArea(element: UnifoldTextArea): HTMLTextAreaElement {
  const textarea = element.shadowRoot?.querySelector("textarea");
  if (!(textarea instanceof HTMLTextAreaElement)) throw new Error("Textarea is missing.");
  return textarea;
}

function requiredEvent(events: readonly UiEvent[]): UiEvent {
  const event = events[0];
  if (event === undefined) throw new Error("Textarea event is missing.");
  return event;
}

function detail(event: Event): UiEvent {
  return (event as CustomEvent<UiEvent>).detail;
}
