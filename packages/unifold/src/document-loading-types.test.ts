import { expect, it } from "vitest";

import {
  UnifoldDocumentIntegrity,
  UnifoldDocumentLoadLimit,
  UnifoldDocumentLoadStatus,
  UnifoldDocumentTrustRequirement
} from "./document-loading-types.js";

it("publishes finite document-loading policy values as enums", () => {
  expect(UnifoldDocumentTrustRequirement.RequireSignature).toBe("require-signature");
  expect(UnifoldDocumentIntegrity.VerifiedSignature).toBe("verified-signature");
  expect(UnifoldDocumentLoadStatus.Rejected).toBe("rejected");
  expect(UnifoldDocumentLoadLimit.MaxMigrationSteps).toBe(16);
});
