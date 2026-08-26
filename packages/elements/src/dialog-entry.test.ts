// @vitest-environment happy-dom
import { CoreElementTag } from "@unislang/unifold-catalog";
import { expect, it, vi } from "vitest";

import { defineUnifoldDialog, UnifoldDialog } from "./dialog-entry.js";

it("defines the optional Dialog family idempotently", () => {
  const first = defineUnifoldDialog(customElements);
  const second = defineUnifoldDialog(customElements);
  expect(first).toMatchObject({ definedTags: [CoreElementTag.Dialog], status: "registered" });
  expect(second).toMatchObject({ definedTags: [], status: "registered" });
  expect(customElements.get(CoreElementTag.Dialog)).toBe(UnifoldDialog);
});

it("rejects Dialog registration without a registry or custom-elements environment", () => {
  expect(defineUnifoldDialog(null)).toMatchObject({ definedTags: [], status: "rejected" });
  vi.stubGlobal("customElements", undefined);
  expect(defineUnifoldDialog()).toMatchObject({ definedTags: [], status: "rejected" });
  vi.unstubAllGlobals();
});
