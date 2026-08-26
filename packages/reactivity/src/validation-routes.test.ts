import { UiNodeKind, UiValidationSeverity } from "@unislang/unifold-events";
import { expect, it } from "vitest";

import { createValidationRoutes } from "./validation-routes.js";
import { controlNode } from "./test-helpers.js";

it("routes an owner error only to distinct affected controls", () => {
  const confirm = controlNode("confirm", "Grace", "form");
  const form = withError(aggregateNode("form"), "confirm");

  expect(createValidationRoutes({ confirm, form })).toEqual({
    confirm: [form.control?.errors[0]]
  });
});

it("rejects missing and non-control targets", () => {
  const form = withError(aggregateNode("form"), "missing");
  expect(() => createValidationRoutes({ form })).toThrow("Unknown validation target: missing");
  const target = aggregateNode("target");
  delete target.control;
  expect(() => createValidationRoutes({ form: withError(form, "target"), target })).toThrow(
    "Validation target is not a control: target"
  );
});

function withError(node: ReturnType<typeof aggregateNode>, affectedId: string) {
  if (node.control === undefined) throw new Error("Aggregate fixture is missing its control.");
  return {
    ...node,
    control: {
      ...node.control,
      errors: [
        {
          affectedIds: [affectedId],
          code: "match",
          messageKey: "validation.match",
          ownerId: node.id,
          severity: UiValidationSeverity.Error,
          validatorId: "match"
        }
      ]
    }
  };
}

function aggregateNode(id: string) {
  return { ...controlNode(id, ""), kind: UiNodeKind.Form };
}
