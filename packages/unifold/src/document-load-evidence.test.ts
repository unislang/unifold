import { UiDocumentSignatureAlgorithm } from "@unislang/unifold-contracts";
import { expect, it, vi } from "vitest";

import {
  auditDocumentLoad,
  captureDocumentSignature,
  createDocumentLoadEvidence
} from "./document-load-evidence.js";
import {
  UnifoldDocumentIntegrity,
  UnifoldDocumentKeyStatus,
  UnifoldDocumentLoadAuditOutcome,
  UnifoldDocumentSourceKind,
  UnifoldDocumentTrustRequirement,
  type LoadUnifoldDocumentOptions,
  type UnifoldDocumentLoadAuditRecord
} from "./document-loading-types.js";

it("classifies sources and captures bounded signature evidence", () => {
  const unsigned = createDocumentLoadEvidence("{}");
  const signed = createDocumentLoadEvidence({});
  expect(unsigned.sourceKind).toBe(UnifoldDocumentSourceKind.UnsignedJson);
  expect(signed.sourceKind).toBe(UnifoldDocumentSourceKind.Unknown);
  captureDocumentSignature(signed, {
    algorithm: UiDocumentSignatureAlgorithm.Ed25519,
    keyId: "release-key-1",
    value: "a".repeat(86)
  });
  expect(signed).toMatchObject({
    keyId: "release-key-1",
    sourceKind: UnifoldDocumentSourceKind.SignedEnvelope
  });
});

it("records metadata-only load evidence and projects its receipt", async () => {
  const records: UnifoldDocumentLoadAuditRecord[] = [];
  const options = auditedOptions(records);
  const evidence = createDocumentLoadEvidence({});
  Object.assign(evidence, {
    integrity: UnifoldDocumentIntegrity.VerifiedSignature,
    issuer: "https://issuer.example",
    keyId: "release-key-1",
    migrationCount: 2,
    payloadSha256: "a".repeat(64),
    sourceKind: UnifoldDocumentSourceKind.SignedEnvelope
  });
  const audit = await auditDocumentLoad(options, evidence, UnifoldDocumentLoadAuditOutcome.Loaded);
  expect(audit).toEqual({ recordId: "audit-1", recordedAt: "2026-08-26T08:00:00.000Z" });
  expect(records).toEqual([
    {
      integrity: UnifoldDocumentIntegrity.VerifiedSignature,
      issuer: "https://issuer.example",
      keyId: "release-key-1",
      migrationCount: 2,
      outcome: UnifoldDocumentLoadAuditOutcome.Loaded,
      payloadSha256: "a".repeat(64),
      sourceKind: UnifoldDocumentSourceKind.SignedEnvelope
    }
  ]);
  expect(records[0]).not.toHaveProperty("payload");
  expect(evidence.auditAttempted).toBe(true);
});

it("does not mark an audit attempt when no policy is configured", async () => {
  const evidence = createDocumentLoadEvidence("{}");
  const result = await auditDocumentLoad(
    { trustRequirement: UnifoldDocumentTrustRequirement.AllowUnsigned },
    evidence,
    UnifoldDocumentLoadAuditOutcome.Loaded
  );
  expect(result).toBeUndefined();
  expect(evidence.auditAttempted).toBe(false);
});

function auditedOptions(records: UnifoldDocumentLoadAuditRecord[]): LoadUnifoldDocumentOptions {
  return {
    provenancePolicy: {
      audit: {
        record: vi.fn(async (record) => {
          records.push(record);
          return { recordId: "audit-1", recordedAt: "2026-08-26T08:00:00.000Z" };
        })
      },
      trustResolver: {
        resolve: vi.fn(async () => ({
          issuer: "https://issuer.example",
          key: {} as CryptoKey,
          status: UnifoldDocumentKeyStatus.Active
        }))
      }
    },
    trustRequirement: UnifoldDocumentTrustRequirement.RequireSignature
  };
}
