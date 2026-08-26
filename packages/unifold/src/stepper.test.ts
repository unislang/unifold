// @vitest-environment happy-dom
import { CoreElementTag } from "@unislang/unifold-catalog";
import { expect, it } from "vitest";

import { defineUnifoldStepper } from "./stepper.js";

it("exposes the optional Stepper family from Unifold", () => {
  expect(defineUnifoldStepper(customElements).definedTags).toEqual([CoreElementTag.Stepper]);
});
