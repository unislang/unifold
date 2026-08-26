import { expect, it, vi } from "vitest";

import { UiAsyncValidatorRegistry } from "./async-registry.js";
import { validationNode } from "./forms.test-data.js";

it("runs declared async validators with the caller's abort signal", async () => {
  const registry = new UiAsyncValidatorRegistry();
  const validate = vi.fn(async () => []);
  registry.register("available", { validate });
  const controller = new AbortController();
  const node = withAsyncValidator(validationNode("Ada"), "available");

  await expect(registry.validate(node, controller.signal)).resolves.toEqual([]);
  expect(validate).toHaveBeenCalledWith({ node, value: "Ada" }, controller.signal);
});

it("rejects duplicate and unknown async validators", async () => {
  const registry = new UiAsyncValidatorRegistry();
  registry.register("known", { validate: async () => [] });
  expect(() => registry.register("known", { validate: async () => [] })).toThrow(
    "Async validator is already registered"
  );
  await expect(
    registry.validate(
      withAsyncValidator(validationNode("Ada"), "missing"),
      new AbortController().signal
    )
  ).rejects.toThrow("Unknown async validator: missing");
});

function withAsyncValidator(node: ReturnType<typeof validationNode>, id: string) {
  if (node.control === undefined) throw new Error("Fixture control is missing.");
  return { ...node, control: { ...node.control, asyncValidatorIds: [id] } };
}
