// @vitest-environment happy-dom
import { CoreElementTag } from "@unislang/unifold-catalog";
import { expect, it } from "vitest";

import { defineUnifoldWizard } from "./wizard-entry.js";

it("registers the deferred Wizard family", () => {
  expect(defineUnifoldWizard(customElements).definedTags).toEqual([CoreElementTag.Wizard]);
});
