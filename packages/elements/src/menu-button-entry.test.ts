// @vitest-environment happy-dom
import { CoreElementTag } from "@unislang/unifold-catalog";
import { expect, it } from "vitest";

import { defineUnifoldMenuButton } from "./menu-button-entry.js";

it("registers the deferred MenuButton family", () => {
  expect(defineUnifoldMenuButton(customElements).definedTags).toEqual([CoreElementTag.MenuButton]);
});
