// @vitest-environment happy-dom
import { CoreElementTag } from "@unislang/unifold-catalog";
import { expect, it } from "vitest";

import { defineUnifoldVirtualList } from "./virtual-list.js";

it("exposes the optional VirtualList family from Unifold", () => {
  expect(defineUnifoldVirtualList(customElements).definedTags).toEqual([
    CoreElementTag.VirtualList
  ]);
});
