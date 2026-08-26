import { expect, it } from "vitest";

import {
  UnifoldDocumentIntegrity,
  UnifoldDocumentKeyStatus,
  UnifoldDocumentLoadAuditOutcome,
  UnifoldDocumentLoadLimit,
  UnifoldDocumentLoadStatus,
  UnifoldDocumentSourceKind,
  UnifoldDocumentTrustRequirement
} from "./document-loading-types.js";

it("publishes finite document-loading policy values as enums", () => {
  expect(UnifoldDocumentTrustRequirement.RequireSignature).toBe("require-signature");
  expect(UnifoldDocumentIntegrity.VerifiedSignature).toBe("verified-signature");
  expect(UnifoldDocumentKeyStatus.Revoked).toBe("revoked");
  expect(UnifoldDocumentLoadAuditOutcome.Rejected).toBe("rejected");
  expect(UnifoldDocumentSourceKind.SignedEnvelope).toBe("signed-envelope");
  expect(UnifoldDocumentLoadStatus.Rejected).toBe("rejected");
  expect(UnifoldDocumentLoadLimit.MaxMigrationSteps).toBe(16);
});
