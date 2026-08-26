// @vitest-environment happy-dom
import { AlertTone } from "@unislang/unifold-catalog";
import { expect, it } from "vitest";

import { registerCoreElements, UnifoldAlert } from "./index.js";

it("renders polite and urgent native live-region semantics", async () => {
  registerCoreElements();
  const element = document.createElement("unifold-alert") as UnifoldAlert;
  element.title = "Draft saved";
  element.content = "Your changes are stored locally.";
  document.body.append(element);
  await element.updateComplete;
  const region = requiredRegion(element);
  expect(region.getAttribute("role")).toBe("status");
  expect(region.getAttribute("aria-live")).toBe("polite");
  element.tone = AlertTone.Danger;
  await element.updateComplete;
  expect(region.getAttribute("role")).toBe("alert");
  expect(region.getAttribute("aria-live")).toBe("assertive");
});

function requiredRegion(element: UnifoldAlert): HTMLDivElement {
  const region = element.shadowRoot?.querySelector("div");
  if (!(region instanceof HTMLDivElement)) throw new Error("Alert region is missing.");
  return region;
}
