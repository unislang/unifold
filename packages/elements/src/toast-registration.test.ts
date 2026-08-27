// @vitest-environment happy-dom
import { CoreElementTag } from "@unislang/unifold-catalog";
import { expect, it, vi } from "vitest";

import { defineUnifoldToast } from "./toast-registration.js";
import { UnifoldToast } from "./toast.js";

it("defines the deferred Toast idempotently", () => {
  expect(defineUnifoldToast(customElements)).toMatchObject({
    definedTags: [CoreElementTag.Toast],
    status: "registered"
  });
  expect(defineUnifoldToast(customElements)).toMatchObject({
    definedTags: [],
    status: "registered"
  });
  expect(customElements.get(CoreElementTag.Toast)).toBe(UnifoldToast);
});

it("rejects registration without a Custom Elements registry", () => {
  vi.stubGlobal("customElements", undefined);
  expect(defineUnifoldToast().status).toBe("rejected");
  vi.unstubAllGlobals();
});
