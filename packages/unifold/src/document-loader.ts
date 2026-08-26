import {
  UiDocumentEnvelopeSchemaUri,
  UiDocumentEnvelopeVersion,
  UiDocumentSignatureAlgorithm,
  type JsonObject,
  type SignedUiDocumentEnvelope,
  type UiDocumentSignature
} from "@unislang/unifold-contracts";

import { prepareUnifoldDocument } from "./compiler.js";
import {
  DocumentLoadRejection,
  auditDocumentLoad,
  captureDocumentSignature,
  createDocumentLoadEvidence,
  rejectDocument as reject,
  rejectDocumentLoad,
  type DocumentLoadEvidence
} from "./document-load-evidence.js";
import {
  fingerprintDocumentPayload,
  resolveDocumentVerificationTrust
} from "./document-provenance.js";
import {
  UnifoldDocumentIntegrity,
  UnifoldDocumentLoadAuditOutcome,
  UnifoldDocumentLoadDiagnosticCode,
  UnifoldDocumentLoadLimit,
  UnifoldDocumentLoadStatus,
  UnifoldDocumentMigrationStatus,
  UnifoldDocumentTrustRequirement,
  type LoadedUnifoldDocumentResult,
  type LoadUnifoldDocumentOptions,
  type LoadUnifoldDocumentResult,
  type UnifoldDocumentProvenance
} from "./document-loading-types.js";
import { migrateUnifoldDocument } from "./document-migration.js";
import { UnifoldPreparationStatus, type PreparedUnifoldDocument } from "./types.js";

interface ExtractedPayload {
  readonly payload: string;
  readonly signature?: UiDocumentSignature;
}

interface VerifiedIntegrity {
  readonly integrity: UnifoldDocumentIntegrity;
  readonly issuer?: string;
  readonly keyId?: string;
}

export async function loadUnifoldDocument(
  source: unknown,
  options: LoadUnifoldDocumentOptions
): Promise<LoadUnifoldDocumentResult> {
  const evidence = createDocumentLoadEvidence(source);
  try {
    return await loadVerifiedDocument(source, options, evidence);
  } catch (error) {
    return rejectDocumentLoad(error, options, evidence);
  }
}

async function loadVerifiedDocument(
  source: unknown,
  options: LoadUnifoldDocumentOptions,
  evidence: DocumentLoadEvidence
): Promise<LoadedUnifoldDocumentResult> {
  const extracted = extractPayload(source);
  captureDocumentSignature(evidence, extracted.signature);
  assertPayloadSize(extracted.payload, options.maxPayloadBytes);
  evidence.payloadSha256 = await fingerprintDocumentPayload(extracted.payload);
  const verified = await verifyIntegrity(extracted, options, evidence);
  const parsed = parsePayload(extracted.payload);
  const migration = migrateUnifoldDocument(parsed, options.migrations ?? []);
  const migrated = requireMigration(migration);
  evidence.migrationCount = migrated.appliedMigrations.length;
  const prepared = requirePreparation(prepareUnifoldDocument(migrated.document));
  const provenance: UnifoldDocumentProvenance = {
    appliedMigrations: migrated.appliedMigrations,
    integrity: verified.integrity,
    originalSchemaVersion: migrated.originalSchemaVersion,
    payloadSha256: evidence.payloadSha256,
    ...verifiedIssuer(verified.issuer),
    ...verifiedKey(verified.keyId)
  };
  const audit = await auditDocumentLoad(options, evidence, UnifoldDocumentLoadAuditOutcome.Loaded);
  return loaded(prepared, { ...provenance, ...(audit === undefined ? {} : { audit }) });
}

function extractPayload(source: unknown): ExtractedPayload {
  if (typeof source === "string") return { payload: source };
  const envelope = requireEnvelope(source);
  return { payload: envelope.payload, signature: envelope.signature };
}

async function verifyIntegrity(
  extracted: ExtractedPayload,
  options: LoadUnifoldDocumentOptions,
  evidence: DocumentLoadEvidence
): Promise<VerifiedIntegrity> {
  if (extracted.signature === undefined) return captureUnsignedIntegrity(options, evidence);
  return verifySignedIntegrity(extracted.payload, extracted.signature, options, evidence);
}

function captureUnsignedIntegrity(
  options: LoadUnifoldDocumentOptions,
  evidence: DocumentLoadEvidence
): VerifiedIntegrity {
  const verified = unsignedIntegrity(options.trustRequirement);
  evidence.integrity = verified.integrity;
  return verified;
}

async function verifySignedIntegrity(
  payload: string,
  signature: UiDocumentSignature,
  options: LoadUnifoldDocumentOptions,
  evidence: DocumentLoadEvidence
): Promise<VerifiedIntegrity> {
  const trust = await resolveDocumentVerificationTrust(signature, options);
  const valid = await verifyPayload(payload, signature.value, trust.key);
  if (!valid)
    reject(UnifoldDocumentLoadDiagnosticCode.SignatureInvalid, "Invalid signature.", "/signature");
  const verified = signedIntegrity(signature.keyId, trust.issuer);
  captureSignedEvidence(evidence, verified);
  return verified;
}

function signedIntegrity(keyId: string, issuer: string | undefined): VerifiedIntegrity {
  return {
    integrity: UnifoldDocumentIntegrity.VerifiedSignature,
    ...(issuer === undefined ? {} : { issuer }),
    keyId
  };
}

function captureSignedEvidence(evidence: DocumentLoadEvidence, verified: VerifiedIntegrity): void {
  evidence.integrity = verified.integrity;
  if (verified.issuer !== undefined) evidence.issuer = verified.issuer;
}

function unsignedIntegrity(requirement: UnifoldDocumentTrustRequirement): VerifiedIntegrity {
  if (requirement === UnifoldDocumentTrustRequirement.RequireSignature) {
    reject(
      UnifoldDocumentLoadDiagnosticCode.SignatureRequired,
      "This document source requires a detached signature.",
      "/signature"
    );
  }
  return { integrity: UnifoldDocumentIntegrity.Unsigned };
}

async function verifyPayload(payload: string, encoded: string, key: CryptoKey): Promise<boolean> {
  const signature = decodeBase64Url(encoded);
  if (signature === undefined) return false;
  try {
    return await globalThis.crypto.subtle.verify(
      UiDocumentSignatureAlgorithm.Ed25519,
      key,
      signature,
      new TextEncoder().encode(payload)
    );
  } catch {
    return false;
  }
}

function parsePayload(payload: string): JsonObject {
  let parsed: unknown;
  try {
    parsed = JSON.parse(payload);
  } catch {
    reject(UnifoldDocumentLoadDiagnosticCode.JsonInvalid, "The document payload is not JSON.", "/");
  }
  if (!isRecord(parsed)) {
    reject(
      UnifoldDocumentLoadDiagnosticCode.JsonInvalid,
      "The document payload must be an object.",
      "/"
    );
  }
  return parsed as JsonObject;
}

function requireEnvelope(source: unknown): SignedUiDocumentEnvelope {
  if (!isRecord(source) || !hasEnvelopeShape(source)) {
    reject(UnifoldDocumentLoadDiagnosticCode.EnvelopeInvalid, "Invalid signed envelope.", "/");
  }
  return source as unknown as SignedUiDocumentEnvelope;
}

function hasEnvelopeShape(value: Record<string, unknown>): boolean {
  return [
    hasExactKeys(value, ["$schema", "envelopeVersion", "payload", "signature"]),
    value["$schema"] === UiDocumentEnvelopeSchemaUri.Version1,
    value["envelopeVersion"] === UiDocumentEnvelopeVersion.Version1,
    typeof value["payload"] === "string",
    hasSignatureShape(value["signature"])
  ].every(Boolean);
}

function hasSignatureShape(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return [
    hasExactKeys(value, ["algorithm", "keyId", "value"]),
    value["algorithm"] === UiDocumentSignatureAlgorithm.Ed25519,
    hasKeyId(value["keyId"]),
    hasEncodedSignature(value["value"])
  ].every(Boolean);
}

function hasKeyId(value: unknown): boolean {
  return typeof value === "string" && value.length > 0 && value.length <= 256;
}

function hasEncodedSignature(value: unknown): boolean {
  return typeof value === "string" && /^[A-Za-z0-9_-]{86}$/u.test(value);
}

function hasExactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const keys = Object.keys(value);
  return keys.length === expected.length && keys.every((key) => expected.includes(key));
}

function assertPayloadSize(payload: string, configuredLimit: number | undefined): void {
  const limit = configuredLimit ?? UnifoldDocumentLoadLimit.MaxPayloadBytes;
  assertPayloadLimit(limit);
  if (new TextEncoder().encode(payload).byteLength > limit) {
    reject(
      UnifoldDocumentLoadDiagnosticCode.PayloadTooLarge,
      "Document payload is too large.",
      "/payload"
    );
  }
}

function assertPayloadLimit(limit: number): void {
  if (Number.isSafeInteger(limit) && limit > 0) return;
  reject(UnifoldDocumentLoadDiagnosticCode.EnvelopeInvalid, "Invalid payload limit.", "/");
}

function decodeBase64Url(value: string): ArrayBuffer | undefined {
  if (!/^[A-Za-z0-9_-]{86}$/u.test(value)) return undefined;
  try {
    const binary = atob(value.replaceAll("-", "+").replaceAll("_", "/") + "==");
    return binaryBuffer(binary);
  } catch {
    return undefined;
  }
}

function binaryBuffer(binary: string): ArrayBuffer {
  const buffer = new ArrayBuffer(binary.length);
  const bytes = new Uint8Array(buffer);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return buffer;
}

function requireMigration(result: ReturnType<typeof migrateUnifoldDocument>) {
  if (result.status === UnifoldDocumentMigrationStatus.Rejected) {
    throw new DocumentLoadRejection([result.diagnostic]);
  }
  return result;
}

function requirePreparation(
  result: ReturnType<typeof prepareUnifoldDocument>
): PreparedUnifoldDocument {
  if (result.status === UnifoldPreparationStatus.Invalid || result.prepared === undefined) {
    throw new DocumentLoadRejection(result.diagnostics);
  }
  return result.prepared;
}

function loaded(
  prepared: PreparedUnifoldDocument,
  provenance: UnifoldDocumentProvenance
): LoadedUnifoldDocumentResult {
  return { diagnostics: [], prepared, provenance, status: UnifoldDocumentLoadStatus.Loaded };
}

function verifiedKey(keyId: string | undefined): { readonly verifiedKeyId?: string } {
  return keyId === undefined ? {} : { verifiedKeyId: keyId };
}

function verifiedIssuer(issuer: string | undefined): { readonly verifiedIssuer?: string } {
  return issuer === undefined ? {} : { verifiedIssuer: issuer };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  if (!isNonNullObject(value)) return false;
  if (Array.isArray(value)) return false;
  return hasPlainPrototype(value);
}

function isNonNullObject(value: unknown): value is object {
  return typeof value === "object" && value !== null;
}

function hasPlainPrototype(value: object): boolean {
  const prototype = Object.getPrototypeOf(value) as unknown;
  return prototype === Object.prototype || prototype === null;
}
