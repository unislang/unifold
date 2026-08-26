import { expect, it } from "vitest";

import { controlPlaneFingerprint } from "./fingerprint.js";

it("uses RFC 8785 canonicalization before request hashing", async () => {
  const first = await controlPlaneFingerprint.fingerprint({ alpha: 1, beta: 2 });
  const second = await controlPlaneFingerprint.fingerprint({ beta: 2, alpha: 1 });
  expect(first).toBe(second);
  expect(first).toMatch(/^[\da-f]{64}$/u);
});
