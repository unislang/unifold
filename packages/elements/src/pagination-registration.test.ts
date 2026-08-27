// @vitest-environment happy-dom
import { CoreElementTag } from "@unislang/unifold-catalog";
import { expect, it, vi } from "vitest";

import { defineUnifoldPagination } from "./pagination-registration.js";
import { UnifoldPagination } from "./pagination.js";

it("defines the deferred Pagination family idempotently", () => {
  expect(defineUnifoldPagination(customElements)).toMatchObject({
    definedTags: [CoreElementTag.Pagination],
    status: "registered"
  });
  expect(defineUnifoldPagination(customElements)).toMatchObject({
    definedTags: [],
    status: "registered"
  });
  expect(customElements.get(CoreElementTag.Pagination)).toBe(UnifoldPagination);
});

it("rejects registration without a Custom Elements registry", () => {
  vi.stubGlobal("customElements", undefined);
  expect(defineUnifoldPagination().status).toBe("rejected");
  vi.unstubAllGlobals();
});
