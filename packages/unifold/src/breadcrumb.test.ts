// @vitest-environment happy-dom
import { CoreElementTag } from "@unislang/unifold-catalog";
import { expect, it } from "vitest";

import { defineUnifoldBreadcrumb, UnifoldBreadcrumb } from "./breadcrumb.js";

it("exports the optional Breadcrumb family from the public facade", () => {
  const result = defineUnifoldBreadcrumb(customElements);
  expect(result).toMatchObject({ definedTags: [CoreElementTag.Breadcrumb], status: "registered" });
  expect(customElements.get(CoreElementTag.Breadcrumb)).toBe(UnifoldBreadcrumb);
});
