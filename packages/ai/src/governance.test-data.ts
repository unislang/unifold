import { DataClassification } from "@unislang/unifold-contracts";

import { canonicalJson } from "./fingerprint.js";
import {
  UiAiManifestCurrency,
  UiAiManifestSignatureAlgorithm,
  UiAiProviderCapability,
  UiAiProviderManifestVersion,
  type SignedUiAiProviderManifest,
  type UiAiProviderManifest
} from "./provider-manifest.js";

export async function manifestFixture(overrides: Partial<UiAiProviderManifest> = {}) {
  const keyPair = (await crypto.subtle.generateKey(UiAiManifestSignatureAlgorithm.Ed25519, true, [
    "sign",
    "verify"
  ])) as CryptoKeyPair;
  const manifest = { ...baseManifest(), ...overrides };
  const signature = await crypto.subtle.sign(
    UiAiManifestSignatureAlgorithm.Ed25519,
    keyPair.privateKey,
    new TextEncoder().encode(canonicalJson(manifest))
  );
  const signedManifest: SignedUiAiProviderManifest = {
    manifest,
    signature: {
      algorithm: UiAiManifestSignatureAlgorithm.Ed25519,
      keyId: "test-key",
      value: base64Url(signature)
    }
  };
  const keys = new Map([["test-key", keyPair.publicKey]]);
  return {
    keys,
    options: {
      nowEpochMs: Date.parse("2026-06-01T00:00:00.000Z"),
      signedManifest,
      trustedKeys: keys
    },
    signedManifest
  };
}

export function baseManifest(): UiAiProviderManifest {
  return {
    capabilities: [UiAiProviderCapability.StructuredOutput],
    classifications: [DataClassification.Public, DataClassification.Internal],
    evaluation: {
      passedAt: "2026-01-01T00:00:00.000Z",
      suiteId: "proposal-suite",
      suiteVersion: "1.0.0"
    },
    expiresAt: "2027-01-01T00:00:00.000Z",
    manifestId: "proposal-manifest",
    maximumInputTokens: 10_000,
    maximumOutputTokens: 1_000,
    modelId: "proposal-v1",
    notBefore: "2026-01-01T00:00:00.000Z",
    policyVersion: "1.0.0",
    pricing: {
      capturedAt: "2026-01-01T00:00:00.000Z",
      currency: UiAiManifestCurrency.Usd,
      inputMicroUsdPerMillionTokens: 2_000_000,
      outputMicroUsdPerMillionTokens: 8_000_000
    },
    promptVersion: "1.0.0",
    providerId: "mock",
    regions: ["us-central"],
    version: UiAiProviderManifestVersion.Version1
  };
}

function base64Url(value: ArrayBuffer): string {
  const binary = String.fromCharCode(...new Uint8Array(value));
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");
}
