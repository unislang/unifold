// @vitest-environment happy-dom
import { CoreElementTag } from "@unislang/unifold-catalog";
import { expect, it } from "vitest";

import { defineUnifoldNumberField, UnifoldNumberField } from "./number-field.js";

it("exposes deferred NumberField registration through the public facade", () => {
  expect(defineUnifoldNumberField(customElements)).toMatchObject({
    definedTags: [CoreElementTag.NumberField],
    status: "registered"
  });
  expect(customElements.get(CoreElementTag.NumberField)).toBe(UnifoldNumberField);
});
