import { expect, it } from "vitest";

import {
  base64Url,
  configuredRecoveryMaximum,
  decodeBase64Url,
  decodeRecoverySnapshot,
  validRecoveryIdentity
} from "./encrypted-recovery-codec.js";

it("round-trips base64url and enforces recovery identity, JSON, and size bounds", () => {
  const bytes = Uint8Array.from([0, 1, 2, 253, 254, 255]);
  expect(decodeBase64Url(base64Url(bytes))).toEqual(bytes);
  expect(decodeRecoverySnapshot(new TextEncoder().encode('{"tenantId":"tenant-1"}'), 1024)).toEqual(
    { tenantId: "tenant-1" }
  );
  expect(() => decodeRecoverySnapshot(new TextEncoder().encode("[]"), 1024)).toThrow(TypeError);
  expect(validRecoveryIdentity("tenant-1")).toBe(true);
  expect(validRecoveryIdentity("bad\nidentity")).toBe(false);
  expect(configuredRecoveryMaximum(undefined)).toBe(16 * 1024 * 1024);
  expect(() => configuredRecoveryMaximum(10)).toThrow(RangeError);
});
