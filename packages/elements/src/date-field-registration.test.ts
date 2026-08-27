// @vitest-environment happy-dom
import { CoreElementTag } from "@unislang/unifold-catalog";
import { expect, it, vi } from "vitest";

import { UnifoldDateField } from "./date-field.js";
import { defineUnifoldDateField } from "./date-field-registration.js";

it("defines the deferred DateField idempotently", () => {
  expect(defineUnifoldDateField(customElements)).toMatchObject({
    definedTags: [CoreElementTag.DateField],
    status: "registered"
  });
  expect(defineUnifoldDateField(customElements)).toMatchObject({
    definedTags: [],
    status: "registered"
  });
  expect(customElements.get(CoreElementTag.DateField)).toBe(UnifoldDateField);
});

it("rejects registration without a Custom Elements registry", () => {
  vi.stubGlobal("customElements", undefined);
  expect(defineUnifoldDateField().status).toBe("rejected");
  vi.unstubAllGlobals();
});
