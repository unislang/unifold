// @vitest-environment happy-dom
import { CoreElementTag } from "@unislang/unifold-catalog";
import { ElementRegistrationStatus } from "@unislang/unifold-elements";
import { expect, it } from "vitest";

import { defineUnifoldFileInput } from "./file-input.js";

it("exposes the optional FileInput family entry point", () => {
  expect(defineUnifoldFileInput(customElements)).toMatchObject({
    definedTags: [CoreElementTag.FileInput],
    status: ElementRegistrationStatus.Registered
  });
});
