import { expect, it } from "vitest";

import { ValidationErrorCode } from "./enums.js";
import { validationNode } from "./forms.test-data.js";
import { requiredErrors } from "./required-validator.js";

it.each([null, "", false, []])("rejects required empty value %#", (value) => {
  expect(requiredErrors(validationNode(value, { required: true }))[0]?.code).toBe(
    ValidationErrorCode.Required
  );
});

it.each(["value", true, ["choice"], 0])("accepts present required value %#", (value) => {
  expect(requiredErrors(validationNode(value, { required: true }))).toEqual([]);
});

it("ignores optional empty values", () => {
  expect(requiredErrors(validationNode(""))).toEqual([]);
});
