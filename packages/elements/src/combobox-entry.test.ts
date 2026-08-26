// @vitest-environment happy-dom
import { CoreElementTag } from "@unislang/unifold-catalog";
import { expect, it } from "vitest";

import { defineUnifoldCombobox } from "./combobox-entry.js";

it("registers the deferred Combobox family", () => {
  expect(defineUnifoldCombobox(customElements).definedTags).toEqual([CoreElementTag.Combobox]);
});
