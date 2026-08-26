// @vitest-environment happy-dom
import { CoreElementTag } from "@unislang/unifold-catalog";
import { expect, it } from "vitest";

import { defineUnifoldCombobox } from "./combobox.js";

it("exposes the optional Combobox family from Unifold", () => {
  expect(defineUnifoldCombobox(customElements).definedTags).toEqual([CoreElementTag.Combobox]);
});
