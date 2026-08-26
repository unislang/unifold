import { expect, it } from "vitest";

import { isSafeJson, isSafeJsonObject, jsonByteLength } from "./json-safety.js";

it("accepts bounded finite JSON and measures its encoded size", () => {
  const value = { array: [null, true, 1, "text"] };
  expect(isSafeJsonObject(value)).toBe(true);
  expect(jsonByteLength(value)).toBeGreaterThan(0);
});

it("rejects unsafe keys, prototypes, cycles, depth, size, and nonfinite numbers", () => {
  const cyclic: Record<string, unknown> = {};
  cyclic["self"] = cyclic;
  let deep: unknown = true;
  for (let index = 0; index < 33; index += 1) deep = [deep];

  expect(isSafeJson(JSON.parse('{"__proto__":{"polluted":true}}'))).toBe(false);
  expect(isSafeJson(new Date())).toBe(false);
  expect(isSafeJson(cyclic)).toBe(false);
  expect(isSafeJson(deep)).toBe(false);
  expect(isSafeJson(new Array(20_001).fill(null))).toBe(false);
  expect(isSafeJson(Number.NaN)).toBe(false);
  expect(jsonByteLength(cyclic)).toBe(Number.POSITIVE_INFINITY);
});
