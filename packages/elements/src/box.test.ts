// @vitest-environment happy-dom
import { LayoutSpace, SurfaceTone } from "@unislang/unifold-catalog";
import { expect, it } from "vitest";

import { registerCoreElements, UnifoldBox } from "./index.js";

it("renders a token-constrained slotted box", async () => {
  registerCoreElements();
  const element = document.createElement("unifold-box") as UnifoldBox;
  element.label = "Support actions";
  element.padding = LayoutSpace.Large;
  element.surface = SurfaceTone.Subtle;
  element.append(document.createElement("button"));
  document.body.append(element);
  await element.updateComplete;
  const container = requiredContainer(element);
  expect(element.getAttribute("padding")).toBe(LayoutSpace.Large);
  expect(element.getAttribute("surface")).toBe(SurfaceTone.Subtle);
  expect(container.getAttribute("role")).toBe("group");
  expect(element.firstElementChild?.tagName).toBe("BUTTON");
});

function requiredContainer(element: UnifoldBox): HTMLDivElement {
  const container = element.shadowRoot?.querySelector("div");
  if (!(container instanceof HTMLDivElement)) throw new Error("Box container is missing.");
  return container;
}
