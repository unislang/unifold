// @vitest-environment happy-dom
import { CoreElementTag } from "@unislang/unifold-catalog";
import { expect, it, vi } from "vitest";

import { defineUnifoldFileInput, UnifoldFileInput } from "./file-input-entry.js";

it("defines the optional FileInput family idempotently", () => {
  const first = defineUnifoldFileInput(customElements);
  const second = defineUnifoldFileInput(customElements);
  expect(first).toMatchObject({ definedTags: [CoreElementTag.FileInput], status: "registered" });
  expect(second).toMatchObject({ definedTags: [], status: "registered" });
  expect(customElements.get(CoreElementTag.FileInput)).toBe(UnifoldFileInput);
});

it("rejects FileInput registration without a registry", () => {
  expect(defineUnifoldFileInput(null)).toMatchObject({ definedTags: [], status: "rejected" });
  vi.stubGlobal("customElements", undefined);
  expect(defineUnifoldFileInput()).toMatchObject({ definedTags: [], status: "rejected" });
  vi.unstubAllGlobals();
});
