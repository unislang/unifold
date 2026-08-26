// @vitest-environment happy-dom
import { CoreElementTag } from "@unislang/unifold-catalog";
import { expect, it, vi } from "vitest";

import { UnifoldSwitch } from "./switch.js";
import { defineUnifoldSwitch } from "./switch-registration.js";

it("defines the deferred Switch idempotently", () => {
  expect(defineUnifoldSwitch(customElements)).toMatchObject({
    definedTags: [CoreElementTag.Switch],
    status: "registered"
  });
  expect(defineUnifoldSwitch(customElements)).toMatchObject({
    definedTags: [],
    status: "registered"
  });
  expect(customElements.get(CoreElementTag.Switch)).toBe(UnifoldSwitch);
});

it("rejects registration without a Custom Elements registry", () => {
  vi.stubGlobal("customElements", undefined);
  expect(defineUnifoldSwitch().status).toBe("rejected");
  vi.unstubAllGlobals();
});
