// @vitest-environment happy-dom
import { expect, it } from "vitest";

import { captureStaticHydrationFocus } from "./hydration-focus.js";

it("captures the exact owned static sub-control without crossing a nested node", () => {
  document.body.innerHTML = `<main data-unifold-static-document="doc">
    <fieldset data-unifold-static-node-id="topics">
      <input data-unifold-static-control="topics"><input data-unifold-static-control="topics">
      <span data-unifold-static-node-id="nested"><input data-unifold-static-control="nested"></span>
    </fieldset>
  </main>`;
  const root = requiredElement("main");
  const controls = root.querySelectorAll<HTMLInputElement>("input");
  controls[1]?.focus();
  expect(captureStaticHydrationFocus(root)).toEqual({
    focusedControlIndex: 1,
    focusedNodeId: "topics"
  });
  controls[2]?.focus();
  expect(captureStaticHydrationFocus(root)).toEqual({
    focusedControlIndex: 0,
    focusedNodeId: "nested"
  });
});

it("ignores absent and unowned focus while retaining a focused static node", () => {
  document.body.innerHTML = `<main>
    <button>Outside node</button>
    <span data-unifold-static-node-id="status" tabindex="0">Status</span>
  </main>`;
  const root = requiredElement("main");
  expect(captureStaticHydrationFocus(root)).toEqual({});
  requiredElement("button").focus();
  expect(captureStaticHydrationFocus(root)).toEqual({});
  requiredElement("span").focus();
  expect(captureStaticHydrationFocus(root)).toEqual({ focusedNodeId: "status" });
});

function requiredElement(selector: string): HTMLElement {
  const element = document.querySelector(selector);
  if (!(element instanceof HTMLElement)) throw new Error("Focus fixture is missing.");
  return element;
}
