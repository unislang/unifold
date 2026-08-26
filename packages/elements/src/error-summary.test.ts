// @vitest-environment happy-dom
import { CoreElementTag } from "@unislang/unifold-catalog";
import type { UiEvent } from "@unislang/unifold-events";
import { expect, it, vi } from "vitest";

import { compositionNode } from "./elements.test-data.js";
import { ElementEventName, ElementEventType } from "./enums.js";
import { UnifoldErrorSummary } from "./error-summary.js";
import { defineUnifoldErrorSummary } from "./form-structure-entry.js";

it("renders nothing for an empty aggregate", async () => {
  const summary = createSummary();
  document.body.append(summary);
  await summary.updateComplete;
  expect(summary.shadowRoot?.childElementCount).toBe(0);
});

it("escapes errors, focuses an exact open-shadow target, and emits one activation", async () => {
  const target = document.createElement("div");
  target.id = "name";
  const input = document.createElement("input");
  const focus = vi.spyOn(input, "focus");
  const shadow = target.attachShadow({ mode: "open" });
  shadow.append(input);
  const summary = createSummary();
  summary.id = "errors";
  summary.eventNode = compositionNode("errors", {});
  summary.errors = [{ message: "Enter <name>", targetId: "name" }];
  const events: UiEvent[] = [];
  summary.addEventListener(ElementEventName.UiEvent, (event) => {
    events.push((event as CustomEvent<UiEvent>).detail);
  });
  document.body.append(summary, target);
  await summary.updateComplete;

  const link = requireLink(summary);
  link.click();
  expect(link.textContent).toBe("Enter <name>");
  expect(focus).toHaveBeenCalledOnce();
  expect(events).toHaveLength(1);
  expect(events[0]).toMatchObject({
    data: { change: { targetId: "name" } },
    type: ElementEventType.ComponentActivated
  });
});

function createSummary(): UnifoldErrorSummary {
  defineUnifoldErrorSummary(customElements);
  return document.createElement(CoreElementTag.ErrorSummary) as UnifoldErrorSummary;
}

function requireLink(summary: UnifoldErrorSummary): HTMLAnchorElement {
  const root = summary.shadowRoot;
  if (root === null) throw new Error("Error summary shadow root is missing.");
  const link = root.querySelector<HTMLAnchorElement>("a");
  if (link === null) throw new Error("Error link is missing.");
  return link;
}
