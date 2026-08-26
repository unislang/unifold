// @vitest-environment happy-dom
import { ElementRegistrationStatus } from "@unislang/unifold";
import { expect, it } from "vitest";

import { installReferenceDialog } from "./dialog-reference.js";

it("appends and registers the deferred Dialog JSON fragment", () => {
  const document = { compositions: [{ template: { $children: [] as unknown[] } }] };
  const registration = installReferenceDialog(document);
  expect(document.compositions[0]?.template.$children).toEqual([
    expect.objectContaining({ $comp: "Dialog", id: "account-review-dialog" })
  ]);
  expect(registration.status).toBe(ElementRegistrationStatus.Registered);
  expect(registration.definedTags).toHaveLength(1);
});
