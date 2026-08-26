// @vitest-environment happy-dom
import { CoreElementTag } from "@unislang/unifold-catalog";
import { expect, it } from "vitest";

import { defineUnifoldVirtualList } from "./virtual-list-entry.js";

it("registers the deferred VirtualList family", () => {
  expect(defineUnifoldVirtualList(customElements).definedTags).toEqual([
    CoreElementTag.VirtualList
  ]);
});
