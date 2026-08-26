// @vitest-environment happy-dom
import { CoreElementTag } from "@unislang/unifold-catalog";
import { expect, it } from "vitest";

import { ElementRegistrationStatus } from "./enums.js";
import { defineUnifoldTooltip } from "./tooltip-entry.js";

it("defines the optional Tooltip family explicitly and idempotently", () => {
  const first = defineUnifoldTooltip(customElements);
  const second = defineUnifoldTooltip(customElements);

  expect(first).toMatchObject({
    definedTags: [CoreElementTag.Tooltip],
    status: ElementRegistrationStatus.Registered
  });
  expect(second).toMatchObject({ definedTags: [], status: ElementRegistrationStatus.Registered });
  expect(customElements.get(CoreElementTag.Tooltip)).toBeDefined();
});
