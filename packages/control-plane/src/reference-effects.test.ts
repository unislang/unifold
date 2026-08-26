import { expect, it, vi } from "vitest";

import { createReferenceEffectRegistry } from "./reference-effects.js";

it("resolves only explicitly registered effects", async () => {
  const invoke = vi.fn(async () => ({ accepted: true }));
  const registry = createReferenceEffectRegistry({ "orders.submit": { invoke } });
  await expect(registry.resolve("orders.submit")?.invoke({ id: 1 })).resolves.toEqual({
    accepted: true
  });
  expect(registry.resolve("https://untrusted.example")).toBeUndefined();
  expect(registry.resolve("toString")).toBeUndefined();
});
