import { UiValidationSeverity } from "@unislang/unifold-events";
import { expect, it } from "vitest";

import { validationNode } from "./forms.test-data.js";
import { UiValidatorRegistry } from "./registry.js";

it("runs registered validators and supports explicit cleanup", () => {
  const registry = new UiValidatorRegistry();
  const unregister = registry.register("minimum", {
    validate: ({ node }) => [
      {
        affectedIds: [node.id],
        code: "minimum",
        messageKey: "validation.minimum",
        severity: UiValidationSeverity.Error,
        validatorId: "minimum"
      }
    ]
  });
  const node = validationNode(1, { validatorIds: ["minimum"] });
  expect(registry.validate(node)).toHaveLength(1);
  unregister();
  expect(() => registry.validate(node)).toThrow("Unknown validator: minimum");
});

it("rejects duplicate and unknown validators", () => {
  const registry = new UiValidatorRegistry();
  registry.register("known", { validate: () => [] });
  expect(() => registry.register("known", { validate: () => [] })).toThrow("already registered");
  expect(() => registry.validate(validationNode("x", { validatorIds: ["missing"] }))).toThrow(
    "Unknown validator: missing"
  );
});
