// @vitest-environment happy-dom
import { CoreElementTag } from "@unislang/unifold-catalog";
import { expect, it, vi } from "vitest";

import { defineUnifoldCheckboxGroup } from "./checkbox-group-registration.js";
import { UnifoldCheckboxGroup } from "./checkbox-group.js";

it("defines the deferred CheckboxGroup idempotently", () => {
  expect(defineUnifoldCheckboxGroup(customElements)).toMatchObject({
    definedTags: [CoreElementTag.CheckboxGroup],
    status: "registered"
  });
  expect(defineUnifoldCheckboxGroup(customElements)).toMatchObject({
    definedTags: [],
    status: "registered"
  });
  expect(customElements.get(CoreElementTag.CheckboxGroup)).toBe(UnifoldCheckboxGroup);
});

it("rejects registration without a Custom Elements registry", () => {
  vi.stubGlobal("customElements", undefined);
  expect(defineUnifoldCheckboxGroup().status).toBe("rejected");
  vi.unstubAllGlobals();
});
