// @vitest-environment happy-dom
import { CoreElementTag } from "@unislang/unifold-catalog";
import { expect, it } from "vitest";

import { defineUnifoldMasterDetail } from "./master-detail.js";

it("exposes the optional MasterDetail family from Unifold", () => {
  expect(defineUnifoldMasterDetail(customElements).definedTags).toEqual([
    CoreElementTag.MasterDetail
  ]);
});
