import {
  UiCommandType,
  UiControlStatus,
  UiEventType,
  UiNodeKind,
  UiValidationSeverity
} from "@unislang/unifold-events";
import { expect, it } from "vitest";

import { createFormResult } from "./form-result.js";
import { controlNode } from "./runtime.test-data.js";

it("creates valid and invalid committed form facts", () => {
  expect(createFormResult(submitCommand(), formSnapshot(UiControlStatus.Valid))).toMatchObject({
    change: { values: "Ada" },
    type: UiEventType.FormSubmitted
  });
  expect(createFormResult(submitCommand(), formSnapshot(UiControlStatus.Invalid))).toMatchObject({
    change: { errors: [{ code: "required" }] },
    type: UiEventType.FormInvalid
  });
});

it("creates a committed reset fact", () => {
  expect(
    createFormResult(
      { id: "form", type: UiCommandType.FormReset },
      formSnapshot(UiControlStatus.Valid)
    )
  ).toMatchObject({ change: { values: "Ada" }, type: UiEventType.FormReset });
});

it("ignores other commands and rejects missing aggregate state", () => {
  const snapshot = formSnapshot(UiControlStatus.Valid);
  const command = { id: "form", type: UiCommandType.ControlMarkTouched } as const;
  expect(createFormResult(command, snapshot)).toBeUndefined();
  expect(() => createFormResult(submitCommand(), withoutControl(snapshot))).toThrow(
    "Form control is missing"
  );
});

function formSnapshot(status: UiControlStatus) {
  const source = controlNode("form", "Ada");
  if (source.control === undefined) throw new Error("Expected aggregate control state.");
  const errors = status === UiControlStatus.Invalid ? [requiredError()] : [];
  return { ...source, kind: UiNodeKind.Form, control: { ...source.control, errors, status } };
}

function requiredError() {
  return {
    code: "required",
    messageKey: "validation.required",
    severity: UiValidationSeverity.Error,
    validatorId: "required"
  };
}

function submitCommand() {
  return { id: "form", type: UiCommandType.FormSubmit } as const;
}

function withoutControl(snapshot: ReturnType<typeof formSnapshot>) {
  const copy = { ...snapshot };
  Reflect.deleteProperty(copy, "control");
  return copy;
}
