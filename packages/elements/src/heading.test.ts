// @vitest-environment happy-dom
import { HeadingLevel, TextTone } from "@unislang/unifold-catalog";
import { expect, it } from "vitest";

import { registerCoreElements, UnifoldHeading } from "./index.js";

it("renders a native heading at an enum-constrained level", async () => {
  registerCoreElements();
  const element = document.createElement("unifold-heading") as UnifoldHeading;
  element.content = "Support resources";
  element.level = HeadingLevel.Three;
  element.tone = TextTone.Muted;
  document.body.append(element);
  await element.updateComplete;
  expect(requiredHeading(element, "h3").textContent).toBe("Support resources");
  element.level = "unsafe" as HeadingLevel;
  await element.updateComplete;
  expect(requiredHeading(element, "h2").textContent).toBe("Support resources");
});

function requiredHeading(element: UnifoldHeading, selector: string): HTMLHeadingElement {
  const root = element.shadowRoot;
  if (root === null) throw new Error("Heading shadow root is missing.");
  const heading = root.querySelector(selector);
  if (!(heading instanceof HTMLHeadingElement)) throw new Error("Native heading is missing.");
  return heading;
}
