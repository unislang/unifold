// @vitest-environment happy-dom
import { CoreElementTag } from "@unislang/unifold-catalog";
import { expect, it } from "vitest";

import { defineUnifoldCheckboxGroup, UnifoldCheckboxGroup } from "./checkbox-group.js";

it("publishes the deferred CheckboxGroup facade", () => {
  expect(defineUnifoldCheckboxGroup()).toMatchObject({
    definedTags: [CoreElementTag.CheckboxGroup],
    status: "registered"
  });
  expect(customElements.get(CoreElementTag.CheckboxGroup)).toBe(UnifoldCheckboxGroup);
});
