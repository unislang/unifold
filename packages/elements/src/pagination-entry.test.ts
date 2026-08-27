// @vitest-environment happy-dom
import { expect, it } from "vitest";

import * as paginationFamily from "./pagination-entry.js";

it("exposes only the deferred Pagination feature boundary", () => {
  expect(Object.keys(paginationFamily).sort()).toEqual([
    "UnifoldPagination",
    "defineUnifoldPagination"
  ]);
});
