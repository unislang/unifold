// @vitest-environment happy-dom
import { CoreElementTag } from "@unislang/unifold-catalog";
import { expect, it } from "vitest";

import { defineUnifoldDateField, UnifoldDateField } from "./date-field.js";

it("publishes deferred DateField registration through the public facade", () => {
  expect(defineUnifoldDateField(customElements)).toMatchObject({
    definedTags: [CoreElementTag.DateField],
    status: "registered"
  });
  expect(customElements.get(CoreElementTag.DateField)).toBe(UnifoldDateField);
});
