// @vitest-environment happy-dom
import { TextSize, TextTone, TextWeight } from "@unislang/unifold-catalog";
import { expect, it } from "vitest";

import { registerCoreElements, UnifoldText } from "./index.js";

it("renders escaped token-constrained paragraph content", async () => {
  registerCoreElements();
  const element = document.createElement("unifold-text") as UnifoldText;
  element.content = "Use <strong>semantic JSON</strong>.";
  element.size = TextSize.Large;
  element.tone = TextTone.Muted;
  element.weight = TextWeight.Semibold;
  document.body.append(element);
  await element.updateComplete;
  const paragraph = requiredParagraph(element);
  expect(paragraph.textContent).toBe("Use <strong>semantic JSON</strong>.");
  expect(paragraph.querySelector("strong")).toBeNull();
  expect(element.getAttribute("size")).toBe(TextSize.Large);
  expect(element.getAttribute("tone")).toBe(TextTone.Muted);
  expect(element.getAttribute("weight")).toBe(TextWeight.Semibold);
});

function requiredParagraph(element: UnifoldText): HTMLParagraphElement {
  const root = element.shadowRoot;
  if (root === null) throw new Error("Text shadow root is missing.");
  const paragraph = root.querySelector("p");
  if (!(paragraph instanceof HTMLParagraphElement)) throw new Error("Text paragraph is missing.");
  return paragraph;
}
