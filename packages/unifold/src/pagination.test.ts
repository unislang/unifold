// @vitest-environment happy-dom
import { CoreElementTag } from "@unislang/unifold-catalog";
import { expect, it } from "vitest";

import { defineUnifoldPagination, UnifoldPagination } from "./pagination.js";

it("publishes the deferred Pagination facade", () => {
  expect(defineUnifoldPagination()).toMatchObject({
    definedTags: [CoreElementTag.Pagination],
    status: "registered"
  });
  expect(customElements.get(CoreElementTag.Pagination)).toBe(UnifoldPagination);
});
