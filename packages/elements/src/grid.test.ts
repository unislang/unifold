// @vitest-environment happy-dom
import { LayoutSpace } from "@unislang/unifold-catalog";
import { expect, it } from "vitest";

import { registerCoreElements, UnifoldGrid } from "./index.js";

it("renders a finite-column token-spaced grid", async () => {
  registerCoreElements();
  const element = document.createElement("unifold-grid") as UnifoldGrid;
  element.columns = 3;
  element.gap = LayoutSpace.Small;
  document.body.append(element);
  await element.updateComplete;
  const container = requiredContainer(element);
  expect(container.style.getPropertyValue("--unifold-grid-columns")).toBe("3");
  expect(element.getAttribute("gap")).toBe(LayoutSpace.Small);
});

function requiredContainer(element: UnifoldGrid): HTMLDivElement {
  const container = element.shadowRoot?.querySelector("div");
  if (!(container instanceof HTMLDivElement)) throw new Error("Grid container is missing.");
  return container;
}
