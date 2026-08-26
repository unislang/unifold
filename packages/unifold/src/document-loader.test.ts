import {
  UiDocumentEnvelopeSchemaUri,
  UiDocumentEnvelopeVersion,
  UiDocumentSignatureAlgorithm,
  type JsonObject,
  type SignedUiDocumentEnvelope
} from "@unislang/unifold-contracts";
import { expect, it, vi } from "vitest";

import { authoredDocument } from "./application.test-data.js";
import { loadUnifoldDocument } from "./document-loader.js";
import {
  UnifoldDocumentIntegrity,
  UnifoldDocumentLoadDiagnosticCode,
  UnifoldDocumentLoadStatus,
  UnifoldDocumentTrustRequirement,
  type UnifoldDocumentKeyResolver,
  type UnifoldDocumentMigration
} from "./document-loading-types.js";

it("loads explicitly allowed unsigned JSON through the existing compiler", async () => {
  const result = await loadUnifoldDocument(JSON.stringify(authoredDocument()), unsignedOptions());
  expect(result.status).toBe(UnifoldDocumentLoadStatus.Loaded);
  if (result.status !== UnifoldDocumentLoadStatus.Loaded) return;
  expect(result.prepared.document.renderOrder).toEqual(["form", "name"]);
  expect(result.provenance.integrity).toBe(UnifoldDocumentIntegrity.Unsigned);
});

it("requires a signature before attempting to parse unsigned content", async () => {
  const result = await loadUnifoldDocument("not-json", {
    trustRequirement: UnifoldDocumentTrustRequirement.RequireSignature
  });
  expect(diagnosticCode(result)).toBe(UnifoldDocumentLoadDiagnosticCode.SignatureRequired);
});

it("verifies exact signed payload bytes before compiling", async () => {
  const keys = await signingKeys();
  const envelope = await signedEnvelope(JSON.stringify(authoredDocument()), keys.privateKey);
  const result = await loadUnifoldDocument(envelope, signedOptions(keys.publicKey));
  expect(result.status).toBe(UnifoldDocumentLoadStatus.Loaded);
  if (result.status !== UnifoldDocumentLoadStatus.Loaded) return;
  expect(result.provenance.integrity).toBe(UnifoldDocumentIntegrity.VerifiedSignature);
  expect(result.provenance.verifiedKeyId).toBe("release-key-1");
});

it("rejects signed payload tampering", async () => {
  const keys = await signingKeys();
  const envelope = await signedEnvelope(JSON.stringify(authoredDocument()), keys.privateKey);
  const tampered = { ...envelope, payload: `${envelope.payload} ` };
  const result = await loadUnifoldDocument(tampered, signedOptions(keys.publicKey));
  expect(diagnosticCode(result)).toBe(UnifoldDocumentLoadDiagnosticCode.SignatureInvalid);
});

it("runs migration only after signature verification", async () => {
  const keys = await signingKeys();
  const migrate = vi.fn((document: JsonObject) => ({ ...document, schemaVersion: "1.0.0" }));
  const envelope = await signedEnvelope(JSON.stringify(legacyDocument()), keys.privateKey);
  const result = await loadUnifoldDocument(envelope, {
    ...signedOptions(keys.publicKey),
    migrations: [migration(migrate)]
  });
  expect(result.status).toBe(UnifoldDocumentLoadStatus.Loaded);
  expect(migrate).toHaveBeenCalledOnce();
});

it("never runs migration for an invalid signature", async () => {
  const keys = await signingKeys();
  const migrate = vi.fn((document: JsonObject) => ({ ...document, schemaVersion: "1.0.0" }));
  const envelope = await signedEnvelope(JSON.stringify(legacyDocument()), keys.privateKey);
  const result = await loadUnifoldDocument(
    { ...envelope, payload: `${envelope.payload} ` },
    { ...signedOptions(keys.publicKey), migrations: [migration(migrate)] }
  );
  expect(diagnosticCode(result)).toBe(UnifoldDocumentLoadDiagnosticCode.SignatureInvalid);
  expect(migrate).not.toHaveBeenCalled();
});

it("rejects unknown verification keys without parsing", async () => {
  const keys = await signingKeys();
  const envelope = await signedEnvelope("not-json", keys.privateKey);
  const result = await loadUnifoldDocument(envelope, {
    keyResolver: { resolve: async () => undefined },
    trustRequirement: UnifoldDocumentTrustRequirement.RequireSignature
  });
  expect(diagnosticCode(result)).toBe(UnifoldDocumentLoadDiagnosticCode.KeyResolutionFailed);
});

it("rejects invalid JSON only after a valid signature", async () => {
  const keys = await signingKeys();
  const envelope = await signedEnvelope("not-json", keys.privateKey);
  const result = await loadUnifoldDocument(envelope, signedOptions(keys.publicKey));
  expect(diagnosticCode(result)).toBe(UnifoldDocumentLoadDiagnosticCode.JsonInvalid);
});

it("rejects envelope fields outside the versioned schema", async () => {
  const keys = await signingKeys();
  const envelope = await signedEnvelope(JSON.stringify(authoredDocument()), keys.privateKey);
  const result = await loadUnifoldDocument(
    { ...envelope, executableModule: "malware.js" },
    signedOptions(keys.publicKey)
  );
  expect(diagnosticCode(result)).toBe(UnifoldDocumentLoadDiagnosticCode.EnvelopeInvalid);
});

it("bounds payload bytes before cryptographic or parsing work", async () => {
  const result = await loadUnifoldDocument(JSON.stringify(authoredDocument()), {
    maxPayloadBytes: 10,
    trustRequirement: UnifoldDocumentTrustRequirement.AllowUnsigned
  });
  expect(diagnosticCode(result)).toBe(UnifoldDocumentLoadDiagnosticCode.PayloadTooLarge);
});

function unsignedOptions() {
  return { trustRequirement: UnifoldDocumentTrustRequirement.AllowUnsigned } as const;
}

function signedOptions(publicKey: CryptoKey) {
  return {
    keyResolver: keyResolver(publicKey),
    trustRequirement: UnifoldDocumentTrustRequirement.RequireSignature
  } as const;
}

function keyResolver(publicKey: CryptoKey): UnifoldDocumentKeyResolver {
  return {
    resolve: async (keyId, algorithm) =>
      keyId === "release-key-1" && algorithm === UiDocumentSignatureAlgorithm.Ed25519
        ? publicKey
        : undefined
  };
}

function migration(migrate: UnifoldDocumentMigration["migrate"]): UnifoldDocumentMigration {
  return { fromVersion: "0.9.0", migrate, toVersion: "1.0.0" };
}

function legacyDocument(): JsonObject {
  return { ...authoredDocument(), schemaVersion: "0.9.0" };
}

async function signingKeys(): Promise<CryptoKeyPair> {
  return globalThis.crypto.subtle.generateKey("Ed25519", false, ["sign", "verify"]);
}

async function signedEnvelope(
  payload: string,
  privateKey: CryptoKey
): Promise<SignedUiDocumentEnvelope> {
  const signature = await globalThis.crypto.subtle.sign(
    UiDocumentSignatureAlgorithm.Ed25519,
    privateKey,
    new TextEncoder().encode(payload)
  );
  return envelope(payload, encode(new Uint8Array(signature)));
}

function envelope(payload: string, value: string): SignedUiDocumentEnvelope {
  return {
    $schema: UiDocumentEnvelopeSchemaUri.Version1,
    envelopeVersion: UiDocumentEnvelopeVersion.Version1,
    payload,
    signature: { algorithm: UiDocumentSignatureAlgorithm.Ed25519, keyId: "release-key-1", value }
  };
}

function encode(bytes: Uint8Array): string {
  let binary = "";
  bytes.forEach((value) => (binary += String.fromCharCode(value)));
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");
}

function diagnosticCode(
  result: Awaited<ReturnType<typeof loadUnifoldDocument>>
): string | undefined {
  return result.diagnostics[0]?.code;
}
