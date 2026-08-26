// @vitest-environment happy-dom
import { CoreElementTag } from "@unislang/unifold-catalog";
import { expect, it, vi } from "vitest";

import { defineUnifoldPopover, UnifoldPopover } from "./popover-entry.js";

it("defines the optional Popover family idempotently", () => {
  const first = defineUnifoldPopover(customElements);
  const second = defineUnifoldPopover(customElements);

  expect(first).toMatchObject({ definedTags: [CoreElementTag.Popover], status: "registered" });
  expect(second).toMatchObject({ definedTags: [], status: "registered" });
  expect(customElements.get(CoreElementTag.Popover)).toBe(UnifoldPopover);
});

it("rejects registration when no registry is available", () => {
  expect(defineUnifoldPopover(null)).toMatchObject({
    definedTags: [],
    status: "rejected"
  });
});

it("rejects default registration outside a custom-elements environment", () => {
  vi.stubGlobal("customElements", undefined);
  expect(defineUnifoldPopover()).toMatchObject({ definedTags: [], status: "rejected" });
  vi.unstubAllGlobals();
});
