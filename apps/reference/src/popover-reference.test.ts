// @vitest-environment happy-dom
import { ElementRegistrationStatus } from "@unislang/unifold";
import { expect, it } from "vitest";

import * as popoverReference from "./popover-reference.js";

it("appends the deferred Popover JSON fragment", () => {
  const document = { compositions: [{ template: { $children: [] as unknown[] } }] };
  const registration = popoverReference.installReferencePopover(document);
  expect(document.compositions[0]?.template.$children).toEqual([
    expect.objectContaining({ $comp: "Popover", id: "account-summary-popover" })
  ]);
  expect(registration.status).toBe(ElementRegistrationStatus.Registered);
  expect(registration.definedTags).toHaveLength(1);
  expect(Reflect.has(popoverReference, "defineUnifoldPopover")).toBe(false);
});
