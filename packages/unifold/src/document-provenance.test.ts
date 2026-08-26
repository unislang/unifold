import { UiDocumentSignatureAlgorithm } from "@unislang/unifold-contracts";
import { expect, it, vi } from "vitest";

import {
  DocumentProvenanceError,
  fingerprintDocumentPayload,
  recordDocumentLoadAudit,
  resolveDocumentVerificationTrust
} from "./document-provenance.js";
import {
  UnifoldDocumentKeyStatus,
  UnifoldDocumentLoadAuditOutcome,
  UnifoldDocumentLoadDiagnosticCode,
  UnifoldDocumentSourceKind,
  UnifoldDocumentTrustRequirement,
  type UnifoldDocumentProvenancePolicy
} from "./document-loading-types.js";

const signature = {
  algorithm: UiDocumentSignatureAlgorithm.Ed25519,
  keyId: "release-key-1",
  value: "a".repeat(86)
} as const;

it("fingerprints the exact document payload", async () => {
  expect(await fingerprintDocumentPayload("{}"), "exact SHA-256").toBe(
    "44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a"
  );
  expect(await fingerprintDocumentPayload("{} ")).not.toBe(await fingerprintDocumentPayload("{}"));
});

it("resolves active trusted issuer metadata", async () => {
  const keys = await signingKeys();
  const policy = provenancePolicy(keys.publicKey);
  const trust = await resolveDocumentVerificationTrust(signature, {
    provenancePolicy: policy,
    trustRequirement: UnifoldDocumentTrustRequirement.RequireSignature
  });
  expect(trust).toEqual({ issuer: "https://issuer.example", key: keys.publicKey });
});

it("rejects revoked keys before verification", async () => {
  const keys = await signingKeys();
  const policy = provenancePolicy(keys.publicKey, UnifoldDocumentKeyStatus.Revoked);
  await expect(
    resolveDocumentVerificationTrust(signature, {
      provenancePolicy: policy,
      trustRequirement: UnifoldDocumentTrustRequirement.RequireSignature
    })
  ).rejects.toMatchObject({ code: UnifoldDocumentLoadDiagnosticCode.KeyRevoked });
});

it("contains malformed trust metadata and provider failures", async () => {
  const keys = await signingKeys();
  const malformed = provenancePolicy(keys.privateKey);
  const failed = provenancePolicy(keys.publicKey);
  vi.mocked(failed.trustResolver.resolve).mockRejectedValueOnce(new Error("private provider"));
  await expectTrustCode(malformed, UnifoldDocumentLoadDiagnosticCode.TrustMetadataInvalid);
  await expectTrustCode(failed, UnifoldDocumentLoadDiagnosticCode.KeyResolutionFailed);
});

it("defensively records bounded audit evidence", async () => {
  const keys = await signingKeys();
  const policy = provenancePolicy(keys.publicKey);
  const entry = {
    migrationCount: 0,
    outcome: UnifoldDocumentLoadAuditOutcome.Loaded,
    sourceKind: UnifoldDocumentSourceKind.SignedEnvelope
  } as const;
  const receipt = await recordDocumentLoadAudit(policy, entry);
  expect(receipt?.recordId).toBe("audit-1");
  expect(policy.audit.record).toHaveBeenCalledWith(entry);
  expect(vi.mocked(policy.audit.record).mock.calls[0]?.[0]).not.toBe(entry);
});

it("rejects thrown and malformed audit receipts", async () => {
  const keys = await signingKeys();
  const policy = provenancePolicy(keys.publicKey);
  vi.mocked(policy.audit.record).mockRejectedValueOnce(new Error("private audit"));
  await expectAuditFailure(policy);
  vi.mocked(policy.audit.record).mockResolvedValueOnce({
    recordId: "",
    recordedAt: "not-a-time"
  });
  await expectAuditFailure(policy);
});

async function expectTrustCode(
  policy: UnifoldDocumentProvenancePolicy,
  code: UnifoldDocumentLoadDiagnosticCode
): Promise<void> {
  await expect(
    resolveDocumentVerificationTrust(signature, {
      provenancePolicy: policy,
      trustRequirement: UnifoldDocumentTrustRequirement.RequireSignature
    })
  ).rejects.toMatchObject({ code });
}

async function expectAuditFailure(policy: UnifoldDocumentProvenancePolicy): Promise<void> {
  await expect(
    recordDocumentLoadAudit(policy, {
      migrationCount: 0,
      outcome: UnifoldDocumentLoadAuditOutcome.Rejected,
      sourceKind: UnifoldDocumentSourceKind.Unknown
    })
  ).rejects.toBeInstanceOf(DocumentProvenanceError);
}

function provenancePolicy(
  key: CryptoKey,
  status = UnifoldDocumentKeyStatus.Active
): UnifoldDocumentProvenancePolicy {
  return {
    audit: {
      record: vi.fn(async () => ({
        recordId: "audit-1",
        recordedAt: "2026-08-26T08:00:00.000Z"
      }))
    },
    trustResolver: {
      resolve: vi.fn(async () => ({ issuer: "https://issuer.example", key, status }))
    }
  };
}

async function signingKeys(): Promise<CryptoKeyPair> {
  return globalThis.crypto.subtle.generateKey("Ed25519", false, ["sign", "verify"]);
}
