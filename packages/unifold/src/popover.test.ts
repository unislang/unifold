// @vitest-environment happy-dom
import { CoreElementTag } from "@unislang/unifold-catalog";
import { ElementRegistrationStatus } from "@unislang/unifold-elements";
import { expect, it } from "vitest";

import { defineUnifoldPopover } from "./popover.js";

it("exposes the optional Popover family entry point", () => {
  expect(defineUnifoldPopover(customElements)).toMatchObject({
    definedTags: [CoreElementTag.Popover],
    status: ElementRegistrationStatus.Registered
  });
});
