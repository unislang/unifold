import type { UiValidationError } from "@unislang/unifold-events";

import { ValidationMessageKey } from "./enums.js";

const defaultMessages: Readonly<Record<string, string>> = {
  [ValidationMessageKey.Required]: "This field is required."
};

export function defaultValidationMessage(error: UiValidationError): string {
  return defaultMessages[error.messageKey] ?? parameterMessage(error) ?? error.messageKey;
}

function parameterMessage(error: UiValidationError): string | undefined {
  const message = error.parameters?.["message"];
  return typeof message === "string" ? message : undefined;
}
