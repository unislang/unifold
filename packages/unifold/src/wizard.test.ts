// @vitest-environment happy-dom
import { CoreElementTag } from "@unislang/unifold-catalog";
import { expect, it } from "vitest";

import { defineUnifoldWizard } from "./wizard.js";

it("exposes the optional Wizard family from Unifold", () => {
  expect(defineUnifoldWizard(customElements).definedTags).toEqual([CoreElementTag.Wizard]);
});
