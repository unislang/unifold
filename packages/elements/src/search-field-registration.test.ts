// @vitest-environment happy-dom
import { CoreElementTag } from "@unislang/unifold-catalog";
import { expect, it, vi } from "vitest";

import { defineUnifoldSearchField } from "./search-field-registration.js";
import { UnifoldSearchField } from "./search-field.js";

it("defines the deferred SearchField idempotently", () => {
  expect(defineUnifoldSearchField(customElements)).toMatchObject({
    definedTags: [CoreElementTag.SearchField],
    status: "registered"
  });
  expect(defineUnifoldSearchField(customElements)).toMatchObject({
    definedTags: [],
    status: "registered"
  });
  expect(customElements.get(CoreElementTag.SearchField)).toBe(UnifoldSearchField);
});

it("rejects registration without a Custom Elements registry", () => {
  vi.stubGlobal("customElements", undefined);
  expect(defineUnifoldSearchField().status).toBe("rejected");
  vi.unstubAllGlobals();
});
