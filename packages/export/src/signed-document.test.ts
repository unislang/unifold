import { UiDocumentSignatureAlgorithm } from "@unislang/unifold-contracts";
import { expect, it } from "vitest";

import { signUiDocumentPayload } from "./signed-document.js";

it("signs the exact payload bytes with an enum-backed Ed25519 envelope", async () => {
  const keys = await globalThis.crypto.subtle.generateKey("Ed25519", false, ["sign", "verify"]);
  const envelope = await signUiDocumentPayload('{"value":1}', "release-key-1", keys.privateKey);
  const verified = await globalThis.crypto.subtle.verify(
    UiDocumentSignatureAlgorithm.Ed25519,
    keys.publicKey,
    decode(envelope.signature.value),
    new TextEncoder().encode(envelope.payload)
  );
  expect(verified).toBe(true);
  expect(envelope.signature.keyId).toBe("release-key-1");
});

it("rejects an empty signing key ID", async () => {
  const keys = await globalThis.crypto.subtle.generateKey("Ed25519", false, ["sign", "verify"]);
  await expect(signUiDocumentPayload("{}", "", keys.privateKey)).rejects.toThrow(/key ID/u);
});

function decode(value: string): ArrayBuffer {
  const binary = atob(value.replaceAll("-", "+").replaceAll("_", "/") + "==");
  const buffer = new ArrayBuffer(binary.length);
  const bytes = new Uint8Array(buffer);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return buffer;
}
