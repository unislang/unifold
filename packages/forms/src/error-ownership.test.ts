import { UiValidationSeverity } from "@unislang/unifold-events";
import { expect, it } from "vitest";

import { ownValidationErrors } from "./error-ownership.js";

it("normalizes validator output to its authoritative owner", () => {
  const source = {
    code: "match",
    messageKey: "validation.match",
    ownerId: "untrusted-owner",
    severity: UiValidationSeverity.Error,
    validatorId: "match"
  };

  expect(ownValidationErrors("form", [source])).toEqual([{ ...source, ownerId: "form" }]);
  expect(source.ownerId).toBe("untrusted-owner");
});
