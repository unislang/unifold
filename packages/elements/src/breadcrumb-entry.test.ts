// @vitest-environment happy-dom
import { CoreElementTag } from "@unislang/unifold-catalog";
import { expect, it, vi } from "vitest";

import { defineUnifoldBreadcrumb, UnifoldBreadcrumb } from "./breadcrumb-entry.js";

it("defines the optional Breadcrumb family idempotently", () => {
  const first = defineUnifoldBreadcrumb(customElements);
  const second = defineUnifoldBreadcrumb(customElements);
  expect(first).toMatchObject({ definedTags: [CoreElementTag.Breadcrumb], status: "registered" });
  expect(second).toMatchObject({ definedTags: [], status: "registered" });
  expect(customElements.get(CoreElementTag.Breadcrumb)).toBe(UnifoldBreadcrumb);
});

it("rejects registration without a custom-elements registry", () => {
  expect(defineUnifoldBreadcrumb(null).status).toBe("rejected");
  vi.stubGlobal("customElements", undefined);
  expect(defineUnifoldBreadcrumb().status).toBe("rejected");
  vi.unstubAllGlobals();
});
