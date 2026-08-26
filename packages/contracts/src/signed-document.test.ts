import { Ajv2020 } from "ajv/dist/2020.js";
import { expect, it } from "vitest";

import schema from "../schemas/signed-ui-document-envelope.schema.json" with { type: "json" };
import {
  UiDocumentEnvelopeSchemaUri,
  UiDocumentEnvelopeVersion,
  UiDocumentSignatureAlgorithm,
  type SignedUiDocumentEnvelope
} from "./signed-document.js";

it("defines an enum-backed detached-signature envelope", () => {
  const envelope: SignedUiDocumentEnvelope = {
    $schema: UiDocumentEnvelopeSchemaUri.Version1,
    envelopeVersion: UiDocumentEnvelopeVersion.Version1,
    payload: "{}",
    signature: {
      algorithm: UiDocumentSignatureAlgorithm.Ed25519,
      keyId: "release-key-1",
      value: "signature"
    }
  };
  expect(envelope.signature.algorithm).toBe(UiDocumentSignatureAlgorithm.Ed25519);
});

it("executes the signed-envelope schema for positive and negative inputs", () => {
  const validate = new Ajv2020({ allErrors: true, strict: true }).compile(schema);
  const envelope = validEnvelope();
  expect(validate(envelope)).toBe(true);
  envelope.signature.value = "not-base64url";
  expect(validate(envelope)).toBe(false);
});

function validEnvelope() {
  return {
    $schema: UiDocumentEnvelopeSchemaUri.Version1,
    envelopeVersion: UiDocumentEnvelopeVersion.Version1,
    payload: "{}",
    signature: {
      algorithm: UiDocumentSignatureAlgorithm.Ed25519,
      keyId: "release-key-1",
      value: "A".repeat(86)
    }
  };
}
