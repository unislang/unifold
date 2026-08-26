import type { JsonObject } from "./json.js";

export enum UiDocumentEnvelopeSchemaUri {
  Version1 = "https://schemas.unifold.org/signed-ui-document-envelope/1.0/schema.json"
}

export enum UiDocumentEnvelopeVersion {
  Version1 = "1.0.0"
}

export enum UiDocumentSignatureAlgorithm {
  Ed25519 = "Ed25519"
}

export interface UiDocumentSignature extends JsonObject {
  readonly algorithm: UiDocumentSignatureAlgorithm;
  readonly keyId: string;
  readonly value: string;
}

export interface SignedUiDocumentEnvelope extends JsonObject {
  readonly $schema: UiDocumentEnvelopeSchemaUri;
  readonly envelopeVersion: UiDocumentEnvelopeVersion;
  readonly payload: string;
  readonly signature: UiDocumentSignature;
}
