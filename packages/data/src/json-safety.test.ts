import { expect, it } from "vitest";

import { isBoundedJson, isBoundedJsonObject, isPlainRecord, jsonBytes } from "./json-safety.js";

it("accepts finite bounded JSON and plain objects", () => {
  expect(isBoundedJson({ nested: [null, true, 1, "safe"] })).toBe(true);
  expect(isBoundedJsonObject(Object.assign(Object.create(null), { value: 1 }))).toBe(true);
  expect(isPlainRecord([])).toBe(false);
  expect(jsonBytes({ value: "safe" })).toBeGreaterThan(0);
});

it("rejects dangerous, cyclic, deep, oversized, and nonfinite values", () => {
  const cyclic: Record<string, unknown> = {};
  cyclic["self"] = cyclic;
  let deep: unknown = true;
  for (let depth = 0; depth < 33; depth += 1) deep = [deep];

  expect(isBoundedJson(JSON.parse('{"constructor":{"value":true}}'))).toBe(false);
  expect(isBoundedJson(cyclic)).toBe(false);
  expect(jsonBytes(cyclic)).toBe(Number.POSITIVE_INFINITY);
  expect(isBoundedJson(deep)).toBe(false);
  expect(isBoundedJson(new Array(10_001).fill(null))).toBe(false);
  expect(isBoundedJson(Number.POSITIVE_INFINITY)).toBe(false);
});
