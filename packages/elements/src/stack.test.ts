// @vitest-environment happy-dom
import { LayoutAlignment, LayoutSpace, StackDirection } from "@unislang/unifold-catalog";
import { expect, it } from "vitest";

import { registerCoreElements, UnifoldStack } from "./index.js";

it("reflects finite stack layout choices", async () => {
  registerCoreElements();
  const element = document.createElement("unifold-stack") as UnifoldStack;
  element.align = LayoutAlignment.Center;
  element.direction = StackDirection.Horizontal;
  element.gap = LayoutSpace.Large;
  document.body.append(element);
  await element.updateComplete;
  expect(element.getAttribute("align")).toBe(LayoutAlignment.Center);
  expect(element.getAttribute("direction")).toBe(StackDirection.Horizontal);
  expect(element.getAttribute("gap")).toBe(LayoutSpace.Large);
  expect(element.shadowRoot?.querySelector('[part="container"]')).not.toBeNull();
});
