import { UiEventType } from "@unislang/unifold-events";
import { expect, it } from "vitest";

import { exampleEvent } from "./effect-actor.test-data.js";
import { createMachineGuardRegistry } from "./guard-registry.js";

it("evaluates trusted predicates and removes registrations", () => {
  const registry = createMachineGuardRegistry();
  const unregister = registry.register(
    "has-source",
    ({ event }) => event.data.sourceNode !== undefined
  );
  const context = { event: exampleEvent(UiEventType.FormSubmitted), snapshot: () => undefined };

  expect(registry.evaluate("has-source", context)).toBe(true);
  expect(() => registry.register("has-source", () => true)).toThrow("already registered");
  unregister();
  expect(registry.has("has-source")).toBe(false);
});

it("fails closed when a trusted predicate throws or returns a non-true value", () => {
  const registry = createMachineGuardRegistry();
  registry.register("throws", () => {
    throw new Error("provider detail");
  });
  registry.register("false", () => false);
  const context = { event: exampleEvent(UiEventType.FormSubmitted), snapshot: () => undefined };

  expect(registry.evaluate("throws", context)).toBe(false);
  expect(registry.evaluate("false", context)).toBe(false);
  expect(registry.evaluate("missing", context)).toBe(false);
});

it("bounds the trusted registry", () => {
  const registry = createMachineGuardRegistry();
  Array.from({ length: 256 }, (_, index) => registry.register(`guard-${index}`, () => true));
  expect(() => registry.register("overflow", () => true)).toThrow("cannot exceed 256");
});
