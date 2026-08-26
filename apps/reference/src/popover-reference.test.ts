// @vitest-environment happy-dom
import { ElementRegistrationStatus } from "@unislang/unifold";
import { expect, it } from "vitest";

import { appendReferencePopover, defineUnifoldPopover } from "./popover-reference.js";

it("appends the deferred Popover JSON fragment", () => {
  const document = { compositions: [{ template: { $children: [] as unknown[] } }] };
  appendReferencePopover(document);
  expect(document.compositions[0]?.template.$children).toEqual([
    expect.objectContaining({ $comp: "Popover", id: "account-summary-popover" })
  ]);
  const registration = defineUnifoldPopover();
  expect(registration.status).toBe(ElementRegistrationStatus.Registered);
  expect(registration.definedTags).toHaveLength(1);
});
