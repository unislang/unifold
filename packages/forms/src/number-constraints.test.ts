import { CoreComponentType } from "@unislang/unifold-contracts";
import { UiControlStatus } from "@unislang/unifold-events";
import { expect, it } from "vitest";

import { validateControl } from "./control-validation.js";
import { createValidatorRegistry } from "./registry.js";
import { validationNode } from "./forms.test-data.js";

it("validates NumberField minimum, maximum, and decimal step in the shared form graph", () => {
  expect(errors(numberNode(-1))).toEqual(["number-minimum"]);
  expect(errors(numberNode(11))).toEqual(["number-maximum"]);
  expect(errors(numberNode(0.3, { max: 1, min: 0.1, step: 0.1 }))).toEqual([]);
  expect(errors(numberNode(0.35, { max: 1, min: 0.1, step: 0.1 }))).toEqual(["number-step"]);
});

it("treats null as empty and composes with required validation", () => {
  const optional = numberNode(null);
  expect(validateControl(optional, createValidatorRegistry()).status).toBe(UiControlStatus.Valid);
  const required = { ...optional, control: { ...requiredControl(optional), required: true } };
  expect(errors(required)).toEqual(["required"]);
});

function requiredControl(node: ReturnType<typeof numberNode>) {
  const control = node.control;
  if (control === undefined) throw new Error("NumberField control state is missing.");
  return control;
}

function errors(node: ReturnType<typeof numberNode>): readonly string[] {
  return validateControl(node, createValidatorRegistry()).errors.map(({ code }) => code);
}

function numberNode(value: number | null, properties = { max: 10, min: 0, step: 1 }) {
  const source = validationNode(value);
  return {
    ...source,
    id: "age",
    instanceId: "age",
    properties,
    type: CoreComponentType.NumberField
  };
}
