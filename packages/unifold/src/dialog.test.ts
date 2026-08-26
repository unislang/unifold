// @vitest-environment happy-dom
import { CoreElementTag } from "@unislang/unifold-catalog";
import { ElementRegistrationStatus } from "@unislang/unifold-elements";
import { expect, it } from "vitest";

import { defineUnifoldDialog } from "./dialog.js";

it("exposes the optional Dialog family entry point", () => {
  expect(defineUnifoldDialog(customElements)).toMatchObject({
    definedTags: [CoreElementTag.Dialog],
    status: ElementRegistrationStatus.Registered
  });
});
