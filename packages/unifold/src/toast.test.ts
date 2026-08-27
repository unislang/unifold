// @vitest-environment happy-dom
import { CoreElementTag } from "@unislang/unifold-catalog";
import { expect, it } from "vitest";

import { defineUnifoldToast, UnifoldToast } from "./toast.js";

it("publishes the deferred Toast facade", () => {
  expect(defineUnifoldToast()).toMatchObject({
    definedTags: [CoreElementTag.Toast],
    status: "registered"
  });
  expect(customElements.get(CoreElementTag.Toast)).toBe(UnifoldToast);
});
