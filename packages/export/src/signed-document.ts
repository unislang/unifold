import {
  UiDocumentEnvelopeSchemaUri,
  UiDocumentEnvelopeVersion,
  UiDocumentSignatureAlgorithm,
  type SignedUiDocumentEnvelope
} from "@unislang/unifold-contracts";

export async function signUiDocumentPayload(
  payload: string,
  keyId: string,
  privateKey: CryptoKey
): Promise<SignedUiDocumentEnvelope> {
  if (keyId.length === 0 || keyId.length > 256)
    throw new Error("A valid signing key ID is required.");
  const signature = await globalThis.crypto.subtle.sign(
    UiDocumentSignatureAlgorithm.Ed25519,
    privateKey,
    new TextEncoder().encode(payload)
  );
  return {
    $schema: UiDocumentEnvelopeSchemaUri.Version1,
    envelopeVersion: UiDocumentEnvelopeVersion.Version1,
    payload,
    signature: {
      algorithm: UiDocumentSignatureAlgorithm.Ed25519,
      keyId,
      value: encodeBase64Url(new Uint8Array(signature))
    }
  };
}

function encodeBase64Url(bytes: Uint8Array): string {
  let binary = "";
  bytes.forEach((value) => (binary += String.fromCharCode(value)));
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");
}
