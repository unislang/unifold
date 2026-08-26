import type { StandardSchemaV1 } from "@standard-schema/spec";
import { expect, it } from "vitest";

import { validationNode } from "./forms.test-data.js";
import { createStandardSchemaValidator } from "./standard-schema.js";

const options = {
  affectedIdsByPath: { "profile.age": ["age-field"] },
  code: "minimum",
  messageKey: "validation.minimum",
  validatorId: "minimum"
};

it("maps Standard Schema issues to stable Unifold errors", () => {
  const validator = createStandardSchemaValidator(failingSchema(), options);
  expect(validator.validate({ node: validationNode(1), value: 1 })[0]).toMatchObject({
    affectedIds: ["age-field"],
    code: "minimum",
    messageKey: "validation.minimum",
    parameters: { message: "Too small", path: "profile.age" },
    validatorId: "minimum"
  });
});

it("accepts successful schemas and rejects async schemas on the sync path", () => {
  const context = { node: validationNode(3), value: 3 };
  expect(createStandardSchemaValidator(successSchema(), options).validate(context)).toEqual([]);
  expect(() => createStandardSchemaValidator(asyncSchema(), options).validate(context)).toThrow(
    "Async Standard Schema"
  );
});

function failingSchema(): StandardSchemaV1 {
  return schema(() => ({ issues: [{ message: "Too small", path: ["profile", { key: "age" }] }] }));
}

function successSchema(): StandardSchemaV1 {
  return schema((value) => ({ value }));
}

function asyncSchema(): StandardSchemaV1 {
  return schema(async (value) => ({ value }));
}

function schema(validate: StandardSchemaV1.Props["validate"]): StandardSchemaV1 {
  return { "~standard": { validate, vendor: "test", version: 1 } };
}
