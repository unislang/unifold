// @vitest-environment happy-dom
import { CoreElementTag } from "@unislang/unifold-catalog";
import { expect, it } from "vitest";

import { defineUnifoldStepper } from "./stepper-entry.js";

it("registers the deferred Stepper family", () => {
  expect(defineUnifoldStepper(customElements).definedTags).toEqual([CoreElementTag.Stepper]);
});
