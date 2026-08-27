import { expect, it } from "vitest";

import { baseManifest, manifestFixture } from "./governance.test-data.js";
import {
  UiAiManifestDiagnosticCode,
  UiAiManifestVerificationStatus,
  UiAiProviderCapability,
  verifyUiAiProviderManifest
} from "./provider-manifest.js";

it("verifies a strict canonical Ed25519 provider manifest", async () => {
  const fixture = await manifestFixture();
  const result = await verifyUiAiProviderManifest(fixture.options);
  expect(result.status).toBe(UiAiManifestVerificationStatus.Verified);
  if (result.status !== UiAiManifestVerificationStatus.Verified) return;
  expect(result.signedManifest.manifest.modelId).toBe("proposal-v1");
});

it.each([
  [
    "unknown field",
    (value: Record<string, unknown>) => ({ ...value, extra: true }),
    UiAiManifestDiagnosticCode.InvalidManifest
  ],
  [
    "duplicate capability",
    (value: Record<string, unknown>) => ({
      ...value,
      capabilities: [
        UiAiProviderCapability.StructuredOutput,
        UiAiProviderCapability.StructuredOutput
      ]
    }),
    UiAiManifestDiagnosticCode.DuplicateValue
  ],
  [
    "invalid timestamp",
    (value: Record<string, unknown>) => ({ ...value, expiresAt: "tomorrow" }),
    UiAiManifestDiagnosticCode.InvalidManifest
  ]
])("rejects an %s", async (_label, mutate, expected) => {
  const fixture = await manifestFixture();
  const signedManifest = {
    ...fixture.signedManifest,
    manifest: mutate(fixture.signedManifest.manifest as unknown as Record<string, unknown>)
  };
  expect(await rejectionCode(signedManifest, fixture.keys)).toBe(expected);
});

it("rejects a manifest altered after signing and an untrusted signer", async () => {
  const fixture = await manifestFixture();
  const altered = {
    ...fixture.signedManifest,
    manifest: { ...fixture.signedManifest.manifest, modelId: "proposal-v2" }
  };
  expect(await rejectionCode(altered, fixture.keys)).toBe(
    UiAiManifestDiagnosticCode.InvalidSignature
  );
  expect(await rejectionCode(fixture.signedManifest, new Map())).toBe(
    UiAiManifestDiagnosticCode.UntrustedKey
  );
});

it.each([
  ["2025-12-31T23:59:59.000Z", UiAiManifestDiagnosticCode.NotYetValid],
  ["2027-01-01T00:00:00.000Z", UiAiManifestDiagnosticCode.Expired]
])("rejects a manifest outside its validity at %s", async (now, expected) => {
  const fixture = await manifestFixture();
  expect(await rejectionCode(fixture.signedManifest, fixture.keys, Date.parse(now))).toBe(expected);
});

it("rejects a retired manifest", async () => {
  const fixture = await manifestFixture({ retirementAt: "2026-06-01T00:00:00.000Z" });
  expect(await rejectionCode(fixture.signedManifest, fixture.keys)).toBe(
    UiAiManifestDiagnosticCode.Retired
  );
});

it.each(["pricing", "evaluation"])("rejects future-dated %s evidence", async (field) => {
  const fixture = await manifestFixture(
    field === "pricing"
      ? { pricing: { ...baseManifest().pricing, capturedAt: "2026-07-01T00:00:00.000Z" } }
      : { evaluation: { ...baseManifest().evaluation, passedAt: "2026-07-01T00:00:00.000Z" } }
  );
  expect(await rejectionCode(fixture.signedManifest, fixture.keys)).toBe(
    UiAiManifestDiagnosticCode.FutureEvidence
  );
});

async function rejectionCode(
  signedManifest: unknown,
  trustedKeys: ReadonlyMap<string, CryptoKey>,
  nowEpochMs = Date.parse("2026-06-01T00:00:00.000Z")
): Promise<UiAiManifestDiagnosticCode | undefined> {
  const result = await verifyUiAiProviderManifest({ nowEpochMs, signedManifest, trustedKeys });
  return result.diagnostics[0]?.code;
}
