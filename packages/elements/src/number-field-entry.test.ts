// @vitest-environment happy-dom
import { CoreElementTag } from "@unislang/unifold-catalog";
import { expect, it, vi } from "vitest";

import { defineUnifoldNumberField, UnifoldNumberField } from "./number-field-entry.js";

it("defines the deferred NumberField idempotently", () => {
  expect(defineUnifoldNumberField(customElements)).toMatchObject({
    definedTags: [CoreElementTag.NumberField],
    status: "registered"
  });
  expect(defineUnifoldNumberField(customElements)).toMatchObject({
    definedTags: [],
    status: "registered"
  });
  expect(defineUnifoldNumberField().status).toBe("registered");
  expect(customElements.get(CoreElementTag.NumberField)).toBe(UnifoldNumberField);
  expect(defineUnifoldNumberField(null).status).toBe("rejected");
});

it("rejects default registration when the Custom Elements registry is unavailable", () => {
  vi.stubGlobal("customElements", undefined);
  expect(defineUnifoldNumberField().status).toBe("rejected");
  vi.unstubAllGlobals();
});
