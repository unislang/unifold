// @vitest-environment happy-dom
import { expect, it, vi } from "vitest";

import { ElementEventName, registerCoreElements, UnifoldComposition } from "./index.js";

it("renders a neutral compositional boundary without emitting events", verifyComposition);

async function verifyComposition(): Promise<void> {
  registerCoreElements();
  const composition = document.createElement("unifold-composition") as UnifoldComposition;
  const content = document.createElement("span");
  content.textContent = "Profile content";
  composition.append(content);
  document.body.append(composition);
  await composition.updateComplete;
  const container = requireContainer(composition);
  const listener = vi.fn();
  composition.addEventListener(ElementEventName.UiEvent, listener);

  expect(container.hasAttribute("role")).toBe(false);
  expect(container.hasAttribute("aria-label")).toBe(false);
  expect(composition.textContent).toContain("Profile content");
  expect(listener).not.toHaveBeenCalled();

  composition.label = "Profile editor";
  await composition.updateComplete;
  expect(container.getAttribute("role")).toBe("group");
  expect(container.getAttribute("aria-label")).toBe("Profile editor");
}

function requireContainer(element: UnifoldComposition): HTMLDivElement {
  const container = element.shadowRoot?.querySelector("div");
  if (!(container instanceof HTMLDivElement)) throw new Error("Composition was not rendered.");
  return container;
}
