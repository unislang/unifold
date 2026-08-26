import { expect, it } from "vitest";

import { canonicalJson, fingerprintJson } from "./fingerprint.js";

it("canonicalizes property order before hashing", async () => {
  expect(canonicalJson({ second: 2, first: 1 })).toBe('{"first":1,"second":2}');
  await expect(fingerprintJson({ second: 2, first: 1 })).resolves.toBe(
    await fingerprintJson({ first: 1, second: 2 })
  );
});

it("rejects values outside canonical JSON", () => {
  expect(() => canonicalJson(undefined)).toThrow(/canonical JSON/u);
});
