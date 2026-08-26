import { expect, it } from "vitest";

import { deepFreeze } from "./deep-freeze.js";

it("recursively freezes objects and arrays", () => {
  const value = { child: { values: [1, 2] } };
  const result = deepFreeze(value);
  expect(Object.isFrozen(result)).toBe(true);
  expect(Object.isFrozen(result.child)).toBe(true);
  expect(Object.isFrozen(result.child.values)).toBe(true);
});

it("returns primitives and already frozen values", () => {
  expect(deepFreeze("value")).toBe("value");
  const value = Object.freeze({ id: "frozen" });
  expect(deepFreeze(value)).toBe(value);
});
