import { expect, it } from "vitest";

import { EncryptedRecoveryErrorCode, EncryptedRecoveryStatus } from "./encrypted-recovery-types.js";

it("keeps encrypted recovery status and safe failure codes stable", () => {
  expect(Object.values(EncryptedRecoveryStatus)).toEqual(["cancelled", "failed", "succeeded"]);
  expect(Object.values(EncryptedRecoveryErrorCode)).toContain("integrity-failed");
  expect(Object.values(EncryptedRecoveryErrorCode)).not.toContain("provider-error");
});
