// @vitest-environment happy-dom
import { CoreElementTag } from "@unislang/unifold-catalog";
import { expect, it } from "vitest";

import { defineUnifoldDataGrid } from "./data-grid-entry.js";

it("registers the deferred DataGrid family", () => {
  expect(defineUnifoldDataGrid(customElements).definedTags).toEqual([CoreElementTag.DataGrid]);
});
