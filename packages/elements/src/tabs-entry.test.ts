// @vitest-environment happy-dom
import { CoreElementTag } from "@unislang/unifold-catalog";
import { expect, it } from "vitest";

import { defineUnifoldTabs } from "./tabs-entry.js";

it("registers the deferred Tabs family", () => {
  expect(defineUnifoldTabs(customElements).definedTags).toEqual([CoreElementTag.Tabs]);
});
