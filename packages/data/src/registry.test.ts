import { expect, it, vi } from "vitest";

import { DataSourceRegistry, isDataOperationId } from "./registry.js";

it("allows only bounded registered operation identifiers", () => {
  const registry = new DataSourceRegistry();
  const handler = vi.fn();
  const unregister = registry.register("customers.search-v2", handler);

  expect(registry.resolve("customers.search-v2")).toBe(handler);
  expect(() => registry.register("customers.search-v2", handler)).toThrow(/already registered/u);
  unregister();
  expect(registry.resolve("customers.search-v2")).toBeUndefined();
  expect(isDataOperationId("https://attacker.invalid/read")).toBe(false);
  expect(() => registry.register("__proto__", handler)).toThrow(/Invalid/u);
});
