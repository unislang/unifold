// @vitest-environment happy-dom
import type { UnifoldApplicationPort } from "@unislang/unifold";
import { UiEventType, type UiEvent } from "@unislang/unifold-events";
import { beforeEach, expect, it } from "vitest";

import type { PrototypeWindow } from "./main.types.js";
import {
  installReferenceEventOutput,
  resetReferenceEventCapture
} from "./reference-event-output.js";

beforeEach(() => {
  document.body.innerHTML =
    '<output data-testid="submitted-value"></output><pre data-testid="event-log"></pre>';
});

it("projects submitted values and captures the same canonical event", () => {
  const fixture = applicationFixture();
  installReferenceEventOutput(fixture.application, true);
  const event = submittedEvent();
  fixture.publish(event);
  expect(testElement("submitted-value").textContent).toBe("Ada");
  expect(testElement("event-log").textContent).toContain(UiEventType.FormSubmitted);
  const target = window as unknown as PrototypeWindow;
  expect(target.__unifoldCapturedEvents).toEqual([event]);
  resetReferenceEventCapture();
  expect(target.__unifoldCapturedEvents).toEqual([]);
});

function applicationFixture(): {
  readonly application: UnifoldApplicationPort;
  readonly publish: (event: UiEvent) => void;
} {
  let listener: ((event: UiEvent) => void) | undefined;
  const events$ = {
    subscribe(next: (event: UiEvent) => void) {
      listener = next;
      return { unsubscribe: () => undefined };
    }
  };
  return {
    application: { runtime: { events$ } } as unknown as UnifoldApplicationPort,
    publish: (event) => listener?.(event)
  };
}

function submittedEvent(): UiEvent {
  return {
    data: { change: { values: { name: "Ada" } } },
    type: UiEventType.FormSubmitted
  } as UiEvent;
}

function testElement(id: string): HTMLElement {
  const element = document.querySelector<HTMLElement>(`[data-testid="${id}"]`);
  if (element === null) throw new Error(`Missing fixture: ${id}.`);
  return element;
}
