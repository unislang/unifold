import { expect, it } from "vitest";

import { createTrustedLayoutDefinitionRegistry } from "./layout-registry.js";

it("snapshots trusted definitions without exposing mutable registry state", () => {
  const definitions = [definition("external")];
  const registry = createTrustedLayoutDefinitionRegistry(definitions);
  requireDefinition(definitions)["layoutType"] = "changed";
  const first = registry.snapshot();
  requireDefinition(first)["layoutType"] = "mutated-snapshot";
  expect(registry.snapshot()[0]?.["layoutType"]).toBe("external");
});

it("bounds the host-supplied definition inventory", () => {
  const definitions = Array.from({ length: 257 }, (_, index) => definition(`layout-${index}`));
  expect(() => createTrustedLayoutDefinitionRegistry(definitions)).toThrow("cannot exceed 256");
});

function definition(layoutType: string) {
  return {
    layoutType,
    template: { id: "root", type: "Stack" },
    variables: {},
    version: "1.0.0"
  };
}

function requireDefinition(definitions: readonly Record<string, unknown>[]) {
  const value = definitions[0];
  if (value === undefined) throw new Error("Expected a layout definition.");
  return value;
}
