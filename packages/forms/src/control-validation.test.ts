import { UiControlStatus } from "@unislang/unifold-events";
import { expect, it } from "vitest";

import { validateControl, withValidatedControl } from "./control-validation.js";
import { validationNode } from "./forms.test-data.js";
import { createValidatorRegistry } from "./registry.js";

it("derives invalid status without mutating the source snapshot", () => {
  const source = validationNode("", { required: true });
  const result = withValidatedControl(source, createValidatorRegistry());
  expect(result.control).toMatchObject({ status: UiControlStatus.Invalid });
  expect(source.control).toMatchObject({ status: UiControlStatus.Valid, errors: [] });
});

it("derives disabled status and rejects non-controls", () => {
  const disabled = validationNode("", { disabled: true, required: true });
  expect(validateControl(disabled, createValidatorRegistry())).toEqual({
    errors: [],
    pending: false,
    status: UiControlStatus.Disabled,
    validationRequestId: null
  });
  const nonControl = withoutControl(disabled);
  expect(() => validateControl(nonControl, createValidatorRegistry())).toThrow("not a control");
});

function withoutControl(node: ReturnType<typeof validationNode>) {
  const copy = { ...node };
  Reflect.deleteProperty(copy, "control");
  return copy;
}
