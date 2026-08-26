// @vitest-environment happy-dom
import { CoreElementTag } from "@unislang/unifold-catalog";
import { expect, it } from "vitest";

import { defineUnifoldMasterDetail } from "./master-detail-entry.js";

it("registers the deferred MasterDetail family", () => {
  expect(defineUnifoldMasterDetail(customElements).definedTags).toEqual([
    CoreElementTag.MasterDetail
  ]);
});
