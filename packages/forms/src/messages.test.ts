import { UiValidationSeverity, type UiValidationError } from "@unislang/unifold-events";
import { expect, it } from "vitest";

import { ValidationMessageKey } from "./enums.js";
import { defaultValidationMessage } from "./messages.js";

it("formats built-in messages and preserves unknown message keys", () => {
  expect(defaultValidationMessage(error(ValidationMessageKey.Required))).toBe(
    "This field is required."
  );
  expect(defaultValidationMessage(error("application.custom"))).toBe("application.custom");
  expect(
    defaultValidationMessage({
      ...error("application.custom"),
      parameters: { message: "Custom schema message." }
    })
  ).toBe("Custom schema message.");
});

function error(messageKey: string): UiValidationError {
  return {
    code: "test",
    messageKey,
    severity: UiValidationSeverity.Error,
    validatorId: "test"
  };
}
