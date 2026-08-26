// @vitest-environment happy-dom
import { IconName, IconSize, IconTone } from "@unislang/unifold-catalog";
import { expect, it } from "vitest";

import { registerCoreElements, UnifoldIcon } from "./index.js";

it("renders labeled and decorative Lucide SVG semantics", async () => {
  registerCoreElements();
  const element = document.createElement("unifold-icon") as UnifoldIcon;
  element.label = "Warning";
  element.name = IconName.Warning;
  element.size = IconSize.Large;
  element.tone = IconTone.Warning;
  document.body.append(element);
  await element.updateComplete;
  const labeled = requiredSvg(element);
  expect(labeled.getAttribute("role")).toBe("img");
  expect(labeled.getAttribute("aria-label")).toBe("Warning");
  expect(labeled.classList.contains("lucide-triangle-alert")).toBe(true);
  element.label = "";
  await element.updateComplete;
  const decorative = requiredSvg(element);
  expect(decorative.getAttribute("aria-hidden")).toBe("true");
  expect(decorative.getAttribute("role")).toBeNull();
});

function requiredSvg(element: UnifoldIcon): SVGElement {
  const root = element.shadowRoot;
  if (root === null) throw new Error("Icon shadow root is missing.");
  const svg = root.querySelector("svg");
  if (!(svg instanceof SVGElement)) throw new Error("Icon SVG is missing.");
  return svg;
}
