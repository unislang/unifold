// @vitest-environment happy-dom
import { CoreElementTag } from "@unislang/unifold-catalog";
import { expect, it } from "vitest";

import { defineUnifoldTabs } from "./tabs.js";

it("exposes the optional Tabs family from Unifold", () => {
  expect(defineUnifoldTabs(customElements).definedTags).toEqual([CoreElementTag.Tabs]);
});
