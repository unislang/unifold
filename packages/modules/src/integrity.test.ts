import { expect, it } from "vitest";

import { uiModuleIntegrity } from "./integrity.js";
import { moduleFixture } from "./test-fixtures.test-data.js";

it("produces deterministic RFC 8785 SHA-256 integrity independent of object key order", async () => {
  const module = moduleFixture();
  const reordered = Object.fromEntries(Object.entries(module).reverse());
  expect(await uiModuleIntegrity(reordered)).toBe(await uiModuleIntegrity(module));
  expect(await uiModuleIntegrity(module)).toMatch(/^sha256-[A-Za-z0-9_-]{43}$/u);
});

it("rejects values that canonical JSON cannot represent", async () => {
  await expect(uiModuleIntegrity({ invalid: Number.NaN })).rejects.toThrow(TypeError);
});
