// @vitest-environment happy-dom
import { CoreElementTag } from "@unislang/unifold-catalog";
import { expect, it } from "vitest";

import { defineUnifoldSwitch, UnifoldSwitch } from "./switch.js";

it("publishes the deferred Switch facade", () => {
  expect(defineUnifoldSwitch()).toMatchObject({
    definedTags: [CoreElementTag.Switch],
    status: "registered"
  });
  expect(customElements.get(CoreElementTag.Switch)).toBe(UnifoldSwitch);
});
