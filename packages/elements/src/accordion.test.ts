// @vitest-environment happy-dom
import type { UiEvent } from "@unislang/unifold-events";
import { UiUpdateTrigger } from "@unislang/unifold-contracts";
import { expect, it } from "vitest";

import { ElementEventName, registerCoreElements, UnifoldAccordion } from "./index.js";
import { controlNode } from "./elements.test-data.js";

it("requests controlled disclosure changes through the unified event", async () => {
  registerCoreElements();
  const element = document.createElement("unifold-accordion") as UnifoldAccordion;
  element.eventNode = controlNode("help", false, undefined, "Accordion");
  element.asyncValidators = ["remote"];
  element.label = "More help";
  element.updateOn = UiUpdateTrigger.Blur;
  element.validators = ["required"];
  document.body.append(element);
  await element.updateComplete;
  const events: UiEvent[] = [];
  element.addEventListener(ElementEventName.UiEvent, (event) => events.push(detail(event)));
  requiredSummary(element).click();
  expect(events[0]?.data.change).toEqual({ value: true });
  expect(requiredProperties(events)).toMatchObject({
    asyncValidators: ["remote"],
    updateOn: UiUpdateTrigger.Blur,
    validators: ["required"]
  });
  expect(requiredDetails(element).open).toBe(false);
  element.value = true;
  await element.updateComplete;
  expect(requiredDetails(element).open).toBe(true);
  element.disabled = true;
  await element.updateComplete;
  requiredSummary(element).click();
  expect(events).toHaveLength(1);
  expect(requiredSummary(element).getAttribute("aria-disabled")).toBe("true");
});

function requiredSummary(element: UnifoldAccordion): HTMLElement {
  const summary = element.shadowRoot?.querySelector("summary");
  if (!(summary instanceof HTMLElement)) throw new Error("Accordion summary is missing.");
  return summary;
}

function requiredDetails(element: UnifoldAccordion): HTMLDetailsElement {
  const details = element.shadowRoot?.querySelector("details");
  if (!(details instanceof HTMLDetailsElement)) throw new Error("Accordion details are missing.");
  return details;
}

function requiredProperties(events: readonly UiEvent[]) {
  const event = events[0];
  if (event === undefined) throw new Error("Accordion event is missing.");
  const snapshot = event.data.snapshot;
  if (snapshot === undefined) throw new Error("Accordion snapshot is missing.");
  return snapshot.properties;
}

function detail(event: Event): UiEvent {
  return (event as CustomEvent<UiEvent>).detail;
}
