import { expect, it } from "vitest";

import { canonicalJson, fingerprintJson, fingerprintText } from "./canonical.js";

it("canonicalizes property order before hashing", async () => {
  expect(canonicalJson({ second: 2, first: 1 })).toBe('{"first":1,"second":2}');
  await expect(fingerprintJson({ second: 2, first: 1 })).resolves.toBe(
    await fingerprintJson({ first: 1, second: 2 })
  );
});

it("rejects values outside canonical JSON", () => {
  expect(() => canonicalJson(undefined)).toThrow(/canonical JSON/u);
});

it("hashes exact UTF-8 text independently of JSON parsing", async () => {
  await expect(fingerprintText("<main>Unifold</main>")).resolves.toMatch(/^[a-f0-9]{64}$/u);
  expect(await fingerprintText("a")).not.toBe(await fingerprintText("A"));
});
