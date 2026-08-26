// @vitest-environment happy-dom
import { CoreElementTag } from "@unislang/unifold-catalog";
import { expect, it } from "vitest";

import { defineUnifoldMenuButton } from "./menu-button.js";

it("exposes the optional MenuButton family from Unifold", () => {
  expect(defineUnifoldMenuButton(customElements).definedTags).toEqual([CoreElementTag.MenuButton]);
});
