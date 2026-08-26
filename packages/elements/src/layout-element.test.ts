// @vitest-environment happy-dom
import { expect, it } from "vitest";

import { UnifoldLayoutElement } from "./layout-element.js";

it("provides an unlabeled neutral layout boundary", () => {
  defineFixture();
  const element = document.createElement("unifold-layout-fixture") as LayoutFixture;
  expect(element.accessibility()).toEqual({ label: undefined, role: undefined });
  element.label = "Actions";
  expect(element.accessibility()).toEqual({ label: "Actions", role: "group" });
});

class LayoutFixture extends UnifoldLayoutElement {
  accessibility() {
    return {
      label: this.groupLabel() || undefined,
      role: this.groupRole() || undefined
    };
  }
}

function defineFixture(): void {
  const tagName = "unifold-layout-fixture";
  if (customElements.get(tagName) === undefined) customElements.define(tagName, LayoutFixture);
}
