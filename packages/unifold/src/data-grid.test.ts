// @vitest-environment happy-dom
import { CoreElementTag } from "@unislang/unifold-catalog";
import { expect, it } from "vitest";

import { defineUnifoldDataGrid } from "./data-grid.js";

it("exposes the optional DataGrid family from Unifold", () => {
  expect(defineUnifoldDataGrid(customElements).definedTags).toEqual([CoreElementTag.DataGrid]);
});
