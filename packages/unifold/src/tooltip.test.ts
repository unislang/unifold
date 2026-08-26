// @vitest-environment happy-dom
import { CoreElementTag } from "@unislang/unifold-catalog";
import { ElementRegistrationStatus } from "@unislang/unifold-elements";
import { expect, it } from "vitest";

import { defineUnifoldTooltip } from "./tooltip.js";

it("exposes the optional Tooltip family entry point", () => {
  expect(defineUnifoldTooltip(customElements)).toMatchObject({
    definedTags: [CoreElementTag.Tooltip],
    status: ElementRegistrationStatus.Registered
  });
});
